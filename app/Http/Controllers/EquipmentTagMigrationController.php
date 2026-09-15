<?php

namespace App\Http\Controllers;

use App\Models\Equipment;
use App\Models\Vessel;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

/**
 * Ferramenta local (dev only) pra migrar os tags de equipamento do
 * Atlântico Sul pra nova árvore de classificação (ISO 14224, estudo do
 * estagiário) -- uma linha do manifesto de cada vez, confirmada à mão.
 *
 * Não é uma tela do dia a dia do sistema: fica de fora da navegação,
 * só acessível por quem sabe a URL. Depois que a migração acabar (e for
 * validada em produção), esta ferramenta pode ser removida.
 */
class EquipmentTagMigrationController extends Controller
{
    private const VESSEL_TAG = 'AS';
    private const MANIFEST_PATH = 'equipment-tag-migration/atlantico-sul.json';
    private const IGNORADOS_PATH = 'equipment-tag-migration/ignorados.json';

    private function authorize_(): void
    {
        $roleName = auth()->user()->role->name ?? null;
        if ($roleName !== 'dev') {
            abort(403, 'Ferramenta de migração de tags: acesso restrito ao dev.');
        }
    }

    public function index()
    {
        $this->authorize_();

        $disk = Storage::disk('local');
        $manifest = json_decode($disk->get(self::MANIFEST_PATH), true);
        $ignorados = $disk->exists(self::IGNORADOS_PATH)
            ? json_decode($disk->get(self::IGNORADOS_PATH), true)
            : [];

        $vessel = Vessel::where('tag', self::VESSEL_TAG)->firstOrFail();
        $equipamentos = Equipment::where('vessel_id', $vessel->id)
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
            'vessel' => ['id' => $vessel->id, 'name' => $vessel->name, 'tag' => $vessel->tag],
            'pendentes' => $pendentes,
            'candidatos' => $equipamentos->where('ja_migrado', false)->values(),
            'jaMigrados' => $jaMigrados,
            'malformados' => $manifest['malformed_excluidos'],
            'totalLimpo' => count($manifest['clean']),
        ]);
    }

    /**
     * Vincula a linha do CSV (tag_novo) a um equipamento já existente no
     * banco: guarda o tag atual em tag_antigo e passa a usar o tag novo
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

    /** Linha do CSV sem correspondente hoje: cria um equipamento novo direto com o tag novo. */
    public function criarNovo(Request $request)
    {
        $this->authorize_();

        $validated = $request->validate([
            'tag_novo' => 'required|string|max:255',
            'nome' => 'required|string|max:255',
        ]);

        $vessel = Vessel::where('tag', self::VESSEL_TAG)->firstOrFail();

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

        $validated = $request->validate(['tag_novo' => 'required|string|max:255']);

        $disk = Storage::disk('local');
        $ignorados = $disk->exists(self::IGNORADOS_PATH)
            ? json_decode($disk->get(self::IGNORADOS_PATH), true)
            : [];

        if (! in_array($validated['tag_novo'], $ignorados, true)) {
            $ignorados[] = $validated['tag_novo'];
            $disk->put(self::IGNORADOS_PATH, json_encode($ignorados, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
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
