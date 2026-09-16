<?php

namespace App\Http\Controllers;

use App\Models\Equipment;
use App\Models\Vessel;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

/**
 * Ferramenta local (dev only) pra migrar os tags de equipamento pra nova
 * árvore de classificação (ISO 14224, estudo do estagiário) -- uma linha
 * do manifesto de cada vez, confirmada à mão. Um manifesto por embarcação
 * (ver src/ArvoreDeEquipamentos, gerado a partir da planilha).
 *
 * Não é uma tela do dia a dia do sistema: fica de fora da navegação, só
 * acessível por quem sabe a URL. Depois que a migração acabar (e for
 * validada em produção), esta ferramenta pode ser removida.
 */
class EquipmentTagMigrationController extends Controller
{
    /** Embarcação (tag) => arquivo do manifesto em storage/app/private/equipment-tag-migration/. */
    private const MANIFESTS = [
        'AS' => 'atlantico-sul.json',
        'CM1' => 'cm1.json',
    ];

    private function authorize_(): void
    {
        $roleName = auth()->user()->role->name ?? null;
        if ($roleName !== 'dev') {
            abort(403, 'Ferramenta de migração de tags: acesso restrito ao dev.');
        }
    }

    private function ignoradosPath(string $vesselTag): string
    {
        return 'equipment-tag-migration/ignorados-' . strtolower($vesselTag) . '.json';
    }

    public function index(string $vessel = 'AS')
    {
        $this->authorize_();

        if (! array_key_exists($vessel, self::MANIFESTS)) {
            abort(404, "Sem manifesto de migração pra embarcação \"{$vessel}\".");
        }

        $disk = Storage::disk('local');
        $manifest = json_decode($disk->get('equipment-tag-migration/' . self::MANIFESTS[$vessel]), true);
        $ignoradosPath = $this->ignoradosPath($vessel);
        $ignorados = $disk->exists($ignoradosPath)
            ? json_decode($disk->get($ignoradosPath), true)
            : [];

        $vesselModel = Vessel::where('tag', $vessel)->firstOrFail();
        $equipamentos = Equipment::where('vessel_id', $vesselModel->id)
            ->orderBy('tag_number')
            ->get(['id', 'tag_number', 'tag_antigo', 'name'])
            ->map(fn (Equipment $e) => [
                'id' => $e->id,
                'tag_number' => $e->tag_number,
                'tag_antigo' => $e->tag_antigo,
                'name' => $e->name,
                'ja_migrado' => ! is_null($e->tag_antigo),
            ]);

        $tagsJaUsadas = $equipamentos->pluck('tag_number')->all();

        $pendentes = collect($manifest['clean'])
            ->reject(fn ($linha) => in_array($linha['tag_novo'], $tagsJaUsadas, true))
            ->reject(fn ($linha) => in_array($linha['tag_novo'], $ignorados, true))
            ->values();

        $jaMigrados = $equipamentos->where('ja_migrado', true)->values();

        return Inertia::render('Equipment/TagMigration', [
            'vessel' => ['id' => $vesselModel->id, 'name' => $vesselModel->name, 'tag' => $vesselModel->tag],
            'vesselsDisponiveis' => Vessel::whereIn('tag', array_keys(self::MANIFESTS))
                ->orderBy('name')
                ->get(['tag', 'name']),
            'pendentes' => $pendentes,
            'candidatos' => $equipamentos->where('ja_migrado', false)->values(),
            'jaMigrados' => $jaMigrados,
            'malformados' => $manifest['malformed_excluidos'] ?? [],
            'ambiguos' => $manifest['ambiguous_excluidos'] ?? [],
            'totalLimpo' => count($manifest['clean']),
        ]);
    }

    /**
     * Vincula a linha do manifesto (tag_novo) a um equipamento já existente
     * no banco: guarda o tag atual em tag_antigo e passa a usar o tag novo
     * como tag_number -- e reescreve o snapshot de todas as OS já
     * lançadas pra esse equipamento, pra tudo ficar consistente.
     */
    public function vincular(Request $request)
    {
        $this->authorize_();

        $validated = $request->validate([
            'equipment_id' => 'required|uuid|exists:equipment,id',
            'tag_novo' => 'required|string|max:255',
        ]);

        $equipment = Equipment::findOrFail($validated['equipment_id']);

        if (! is_null($equipment->tag_antigo)) {
            abort(422, 'Este equipamento já foi migrado.');
        }

        $tagAntigo = $equipment->tag_number;

        $equipment->update([
            'tag_antigo' => $tagAntigo,
            'tag_number' => $validated['tag_novo'],
        ]);

        // Reescreve o snapshot de TODA OS já lançada pra esse equipamento --
        // decisão explícita: unifica a visualização em vez de manter o tag
        // antigo congelado no histórico.
        $osAtualizadas = WorkOrder::where('equipment_id', $equipment->id)
            ->update(['tag_number' => $validated['tag_novo']]);

        return back()->with('success', "Vinculado: {$tagAntigo} -> {$validated['tag_novo']}. {$osAtualizadas} OS atualizada(s).");
    }

    /** Linha do manifesto sem correspondente hoje: cria um equipamento novo direto com o tag novo. */
    public function criarNovo(Request $request)
    {
        $this->authorize_();

        $validated = $request->validate([
            'vessel' => 'required|string|in:' . implode(',', array_keys(self::MANIFESTS)),
            'tag_novo' => 'required|string|max:255',
            'nome' => 'required|string|max:255',
        ]);

        $vessel = Vessel::where('tag', $validated['vessel'])->firstOrFail();

        Equipment::create([
            'vessel_id' => $vessel->id,
            'tag_number' => $validated['tag_novo'],
            'name' => $validated['nome'],
        ]);

        return back()->with('success', "Equipamento novo criado: {$validated['tag_novo']}.");
    }

    /** Deixa a linha de lado por enquanto -- some da lista de pendentes, sem mexer no banco. */
    public function ignorar(Request $request)
    {
        $this->authorize_();

        $validated = $request->validate([
            'vessel' => 'required|string|in:' . implode(',', array_keys(self::MANIFESTS)),
            'tag_novo' => 'required|string|max:255',
        ]);

        $disk = Storage::disk('local');
        $ignoradosPath = $this->ignoradosPath($validated['vessel']);
        $ignorados = $disk->exists($ignoradosPath)
            ? json_decode($disk->get($ignoradosPath), true)
            : [];

        if (! in_array($validated['tag_novo'], $ignorados, true)) {
            $ignorados[] = $validated['tag_novo'];
            $disk->put($ignoradosPath, json_encode($ignorados, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }

        return back()->with('success', 'Linha deixada de lado por enquanto.');
    }

    /** Desfaz uma vinculação: volta o equipamento (e as OS que foram junto) pro tag antigo. */
    public function desfazer(Request $request)
    {
        $this->authorize_();

        $validated = $request->validate(['equipment_id' => 'required|uuid|exists:equipment,id']);

        $equipment = Equipment::findOrFail($validated['equipment_id']);

        if (is_null($equipment->tag_antigo)) {
            abort(422, 'Este equipamento ainda não foi migrado.');
        }

        $tagAntigo = $equipment->tag_antigo;

        WorkOrder::where('equipment_id', $equipment->id)
            ->update(['tag_number' => $tagAntigo]);

        $equipment->update(['tag_number' => $tagAntigo, 'tag_antigo' => null]);

        return back()->with('success', "Desfeito: voltou para {$tagAntigo}.");
    }
}
