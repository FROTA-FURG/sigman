<?php

namespace App\Http\Controllers;

use App\Models\Equipment;
use App\Models\CruiseLeg;
use App\Models\OilActionPlanItem;
use App\Models\OilAnalysisReport;
use App\Models\OilSample;
use App\Models\OilSamplingPoint;
use App\Models\Vessel;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * Análise de Óleo: pontos de coleta, amostras (laudos), plano de ação e
 * laudos submetidos. A carga inicial vem da planilha de gestão
 * (php artisan oil-analysis:import); daqui em diante tudo é lançado na tela.
 *
 * As props saem no mesmo formato (camelCase, condição por rótulo) que a tela
 * já usa, então o frontend não conhece os nomes das colunas.
 */
class OilAnalysisController extends Controller
{
    private const PASTA_LAUDOS = 'oil-analysis/laudos';

    // ------------------------------------------------------------------
    // Telas
    // ------------------------------------------------------------------

    public function index()
    {
        $pontos = OilSamplingPoint::with(['vessel:id,tag', 'samples' => fn ($q) => $q->orderBy('collected_at')->orderBy('sample_number')])
            ->get();

        $vesselIds = $pontos->pluck('vessel_id')->unique();

        return Inertia::render('OilAnalysis/Index', [
            'familias' => config('oil_analysis.familias'),
            'embarcacoes' => Vessel::whereIn('id', $vesselIds)->orderBy('name')->get(['tag', 'name', 'model_path'])
                ->map(fn (Vessel $v) => ['tag' => $v->tag, 'nome' => $v->name, 'modelo3d' => $v->model_path]),
            // Só a última amostra de cada ponto: o card resume a condição atual.
            'pontos' => $pontos->map(fn ($p) => $this->ponto($p, $p->samples->last() ? collect([$p->samples->last()]) : collect())),
            'planos' => OilActionPlanItem::with('vessel:id,tag')->where('status', 'vigente')->get()
                ->groupBy(fn ($i) => $i->vessel->tag)
                ->map(fn ($itens) => $itens->map(fn ($i) => $this->itemPlano($i))->values()),
            'ultimaColeta' => OilSample::max('collected_at'),
        ]);
    }

    public function show(string $vessel)
    {
        $embarcacao = Vessel::where('tag', $vessel)->firstOrFail();

        $pontos = OilSamplingPoint::with(['vessel:id,tag', 'samples' => fn ($q) => $q->orderBy('collected_at')->orderBy('sample_number')])
            ->where('vessel_id', $embarcacao->id)
            ->orderBy('family')->orderBy('name')
            ->get();

        $itens = OilActionPlanItem::with('vessel:id,tag')->where('vessel_id', $embarcacao->id)->get();

        // Cadastro do sistema (só leitura): equipamentos e OS deles, pra gerar
        // OS e decidir entre abrir uma nova ou adiantar uma futura.
        $equipamentos = Equipment::where('vessel_id', $embarcacao->id)->orderBy('name')->get(['id', 'name', 'tag_number', 'tag_antigo']);
        $ordens = WorkOrder::whereIn('equipment_id', $equipamentos->pluck('id'))
            ->orderByDesc('created_at')
            ->get([
                'id', 'os_number', 'equipment_id', 'description', 'maintenance_type',
                'priority', 'status', 'periodicity', 'in_52_week_plan', 'is_inactive',
                'created_at', 'started_at', 'completed_at',
            ]);

        // Plano de cruzeiro (mesma fonte do calendário da tela de OS).
        $planoCruzeiro = CruiseLeg::periodosPorEmbarcacao($embarcacao->id)[$embarcacao->tag] ?? [];

        return Inertia::render('OilAnalysis/Vessel', [
            'familias' => config('oil_analysis.familias'),
            'vesselTag' => $embarcacao->tag,
            'embarcacao' => ['tag' => $embarcacao->tag, 'nome' => $embarcacao->name],
            'pontos' => $pontos->map(fn ($p) => $this->ponto($p, $p->samples)),
            'plano' => $itens->where('status', 'vigente')->sortBy('equipment_name')->map(fn ($i) => $this->itemPlano($i))->values(),
            'historico' => $itens->where('status', 'arquivado')->sortByDesc(fn ($i) => $i->collected_at?->format('Y-m-d') ?? '')->map(fn ($i) => $this->itemPlano($i))->values(),
            'laudosSubmetidos' => OilAnalysisReport::with('uploader:id,username,nickname')
                ->where('vessel_id', $embarcacao->id)->latest()->get()
                ->map(fn ($r) => [
                    'id' => $r->id,
                    'nome' => $r->original_name,
                    'tamanho' => $r->size,
                    'status' => $r->status,
                    'enviadoEm' => $r->created_at?->toIso8601String(),
                    'enviadoPor' => $r->uploader?->nickname ?: $r->uploader?->username,
                    'url' => route('oil-analysis.reports.download', $r->id),
                ]),
            'sistemaEquipamentos' => $equipamentos,
            'ordensServico' => $ordens,
            'planoCruzeiro' => $planoCruzeiro,
        ]);
    }

    // ------------------------------------------------------------------
    // Amostras
    // ------------------------------------------------------------------

    /** Nova análise para o ponto: lançamento manual ou com o PDF do laudo anexado. */
    public function storeSample(Request $request, OilSamplingPoint $point)
    {
        $chaves = $this->chavesDosParametros($point->family);

        $dados = $request->validate([
            'dataColeta' => 'required|date',
            'numeroLaudo' => 'nullable|string|max:255',
            'laboratorio' => 'nullable|string|max:255',
            'produto' => 'nullable|string|max:255',
            'viscosidadeNominal' => 'nullable|numeric',
            'volume' => 'nullable|numeric',
            'horasServico' => 'nullable|numeric',
            'reposicao' => 'nullable|numeric',
            'produtoTrocado' => ['nullable', Rule::in(['Sim', 'Não'])],
            'resultados' => 'required|array',
            'resultados.*' => 'nullable|numeric',
            'condicao' => ['nullable', Rule::in(array_values(config('oil_analysis.condicoes')))],
            'parecerLaboratorio' => 'nullable|string',
            'acaoEquipe' => 'nullable|string',
            'laudo' => 'nullable|file|mimes:pdf|max:20480',
        ]);

        // Só os parâmetros da família, e pelo menos um preenchido.
        $resultados = collect($dados['resultados'])->only($chaves)->map(fn ($v) => $v === null || $v === '' ? null : (float) $v);
        if ($resultados->filter(fn ($v) => $v !== null)->isEmpty()) {
            return back()->withErrors(['resultados' => 'Informe ao menos um resultado.']);
        }

        $caminho = null;
        $nomeOriginal = null;
        if ($request->hasFile('laudo')) {
            $caminho = $request->file('laudo')->store(self::PASTA_LAUDOS . "/{$point->vessel->tag}", 'local');
            $nomeOriginal = $request->file('laudo')->getClientOriginalName();
        }

        DB::transaction(function () use ($point, $dados, $resultados, $caminho, $nomeOriginal, $request) {
            // Nº sequencial por ponto, calculado aqui (não no navegador) pra não repetir.
            $numero = (int) $point->samples()->lockForUpdate()->max('sample_number') + 1;

            OilSample::create([
                'oil_sampling_point_id' => $point->id,
                'sample_number' => $numero,
                'laboratory' => $dados['laboratorio'] ?? null,
                'product' => $dados['produto'] ?? null,
                'nominal_viscosity' => $dados['viscosidadeNominal'] ?? null,
                'volume' => $dados['volume'] ?? null,
                'service_hours' => $dados['horasServico'] ?? null,
                'top_up' => $dados['reposicao'] ?? null,
                'oil_changed' => isset($dados['produtoTrocado']) ? $dados['produtoTrocado'] === 'Sim' : null,
                'collected_at' => $dados['dataColeta'],
                'report_number' => $dados['numeroLaudo'] ?? null,
                'results' => $resultados->all(),
                'condition' => $this->slugCondicao($dados['condicao'] ?? null),
                'lab_opinion' => $this->textoOuNulo($dados['parecerLaboratorio'] ?? null),
                'team_action' => $this->textoOuNulo($dados['acaoEquipe'] ?? null),
                'source' => $caminho ? 'pdf' : 'manual',
                'report_path' => $caminho,
                'report_original_name' => $nomeOriginal,
                'created_by' => $request->user()->id,
            ]);
        });

        return back()->with('success', 'Análise registrada.');
    }

    /** Parecer do laboratório e ação da equipe de uma amostra. */
    public function updateSampleNotes(Request $request, OilSample $sample)
    {
        $dados = $request->validate([
            'parecerLaboratorio' => 'nullable|string',
            'acaoEquipe' => 'nullable|string',
        ]);

        $sample->update([
            'lab_opinion' => $this->textoOuNulo($dados['parecerLaboratorio'] ?? null),
            'team_action' => $this->textoOuNulo($dados['acaoEquipe'] ?? null),
        ]);

        return back()->with('success', 'Parecer e ação atualizados.');
    }

    public function downloadSampleReport(OilSample $sample)
    {
        abort_unless($sample->report_path && Storage::disk('local')->exists($sample->report_path), 404);

        return Storage::disk('local')->response($sample->report_path, $sample->report_original_name ?: 'laudo.pdf');
    }

    // ------------------------------------------------------------------
    // Plano de ação
    // ------------------------------------------------------------------

    /**
     * Novo item do plano a partir de uma amostra do ponto. O item vigente do
     * ponto vai para o histórico (arquivado), como as abas ARMAZ. da planilha.
     */
    public function storeActionPlanItem(Request $request, OilSamplingPoint $point)
    {
        $dados = $request->validate([
            'amostraId' => ['required', 'uuid', Rule::exists('oil_samples', 'id')->where('oil_sampling_point_id', $point->id)],
            'frequenciaMeses' => 'nullable|numeric|min:0',
            'frequenciaHoras' => 'nullable|numeric|min:0',
            'horimetroAtual' => 'nullable|numeric|min:0',
            'acao' => 'required|string',
            'observacoes' => 'nullable|string',
            'responsaveis' => 'nullable|string|max:255',
            'prazo' => 'nullable|date',
        ]);

        $amostra = OilSample::findOrFail($dados['amostraId']);
        $meses = $dados['frequenciaMeses'] ?? null;
        $horas = $dados['frequenciaHoras'] ?? null;
        $horimetro = $dados['horimetroAtual'] ?? null;

        DB::transaction(function () use ($point, $amostra, $dados, $meses, $horas, $horimetro, $request) {
            $atual = OilActionPlanItem::where('oil_sampling_point_id', $point->id)->where('status', 'vigente')->get();

            OilActionPlanItem::whereIn('id', $atual->pluck('id'))->update(['status' => 'arquivado', 'archived_at' => now()]);

            $referencia = $atual->first();
            OilActionPlanItem::create([
                'vessel_id' => $point->vessel_id,
                'oil_sampling_point_id' => $point->id,
                'oil_sample_id' => $amostra->id,
                'equipment_name' => $referencia?->equipment_name ?? $point->name,
                'sheet_tag' => $referencia?->sheet_tag ?? $point->sheet_tag,
                'frequency_months' => $meses,
                'frequency_hours' => $horas,
                'collected_at' => $amostra->collected_at,
                'next_collection_at' => $meses && $amostra->collected_at ? $amostra->collected_at->copy()->addMonthsNoOverflow((int) round($meses)) : null,
                'hour_meter' => $horimetro,
                'next_hour_meter' => $horas && $horimetro !== null ? $horimetro + $horas : null,
                'condition' => $amostra->condition,
                'action' => trim($dados['acao']),
                'notes' => $this->textoOuNulo($dados['observacoes'] ?? null),
                'responsible' => $this->textoOuNulo($dados['responsaveis'] ?? null),
                'deadline' => $dados['prazo'] ?? null,
                'lab_opinion' => $amostra->lab_opinion,
                'status' => 'vigente',
                'source' => 'amostra',
                'created_by' => $request->user()->id,
            ]);
        });

        return back()->with('success', 'Plano de ação gerado.');
    }

    // ------------------------------------------------------------------
    // Laudos submetidos em lote
    // ------------------------------------------------------------------

    public function storeReports(Request $request, string $vessel)
    {
        $embarcacao = Vessel::where('tag', $vessel)->firstOrFail();

        $request->validate([
            'laudos' => 'required|array|min:1|max:30',
            'laudos.*' => 'file|mimes:pdf|max:20480',
        ]);

        foreach ($request->file('laudos') as $arquivo) {
            OilAnalysisReport::create([
                'vessel_id' => $embarcacao->id,
                'path' => $arquivo->store(self::PASTA_LAUDOS . "/{$embarcacao->tag}/submetidos", 'local'),
                'original_name' => $arquivo->getClientOriginalName(),
                'size' => $arquivo->getSize(),
                'uploaded_by' => $request->user()->id,
            ]);
        }

        return back()->with('success', 'Laudos recebidos.');
    }

    public function downloadReport(OilAnalysisReport $report)
    {
        abort_unless(Storage::disk('local')->exists($report->path), 404);

        return Storage::disk('local')->response($report->path, $report->original_name);
    }

    // ------------------------------------------------------------------
    // Formato das props
    // ------------------------------------------------------------------

    private function ponto(OilSamplingPoint $p, $amostras): array
    {
        return [
            'id' => $p->id,
            'tag' => $p->sheet_tag,
            'nome' => $p->name,
            'embarcacao' => $p->vessel->tag,
            'familia' => $p->family,
            'limites' => $p->limits,
            'equipmentId' => $p->equipment_id,
            'amostras' => $amostras->map(fn ($a) => $this->amostra($a))->values(),
        ];
    }

    private function amostra(OilSample $a): array
    {
        return [
            'id' => $a->id,
            'numero' => $a->sample_number,
            'laboratorio' => $a->laboratory,
            'produto' => $a->product,
            'viscosidadeNominal' => $a->nominal_viscosity,
            'volume' => $a->volume,
            'horasServico' => $a->service_hours,
            'reposicao' => $a->top_up,
            'produtoTrocado' => $a->oil_changed === null ? null : ($a->oil_changed ? 'Sim' : 'Não'),
            'dataColeta' => $a->collected_at?->format('Y-m-d'),
            'numeroLaudo' => $a->report_number,
            'resultados' => $a->results ?? [],
            'condicao' => $this->rotuloCondicao($a->condition),
            'parecerLaboratorio' => $a->lab_opinion,
            'acaoEquipe' => $a->team_action,
            'origem' => $a->source,
            'laudo' => $a->report_path
                ? ['nome' => $a->report_original_name, 'url' => route('oil-analysis.samples.report', $a->id)]
                : null,
        ];
    }

    private function itemPlano(OilActionPlanItem $i): array
    {
        return [
            'id' => $i->id,
            'equipamento' => $i->equipment_name,
            'tag' => $i->sheet_tag,
            'equipamentoId' => $i->oil_sampling_point_id,
            'frequenciaMeses' => $i->frequency_months,
            'frequenciaHoras' => $i->frequency_hours,
            'dataColeta' => $i->collected_at?->format('Y-m-d'),
            'dataProximaColeta' => $i->next_collection_at?->format('Y-m-d'),
            'horimetroAtual' => $i->hour_meter,
            'horimetroProximaColeta' => $i->next_hour_meter,
            'condicao' => $this->rotuloCondicao($i->condition),
            'acao' => $i->action,
            'observacoes' => $i->notes,
            'responsaveis' => $i->responsible,
            'prazo' => $i->deadline?->format('Y-m-d'),
            'parecerLaboratorio' => $i->lab_opinion,
            'origem' => $i->source,
            'arquivadoEm' => $i->archived_at?->toIso8601String(),
        ];
    }

    private function chavesDosParametros(string $familia): array
    {
        return collect(config("oil_analysis.familias.{$familia}.grupos", []))
            ->flatMap(fn ($g) => collect($g['parametros'])->pluck('chave'))
            ->all();
    }

    private function rotuloCondicao(?string $slug): ?string
    {
        return $slug ? (config('oil_analysis.condicoes')[$slug] ?? null) : null;
    }

    private function slugCondicao(?string $rotulo): ?string
    {
        if (! $rotulo) {
            return null;
        }
        $slug = array_search($rotulo, config('oil_analysis.condicoes'), true);

        return $slug === false ? null : $slug;
    }

    private function textoOuNulo(?string $texto): ?string
    {
        $texto = trim((string) $texto);

        return $texto === '' ? null : $texto;
    }
}
