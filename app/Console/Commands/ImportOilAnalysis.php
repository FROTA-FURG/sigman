<?php

namespace App\Console\Commands;

use App\Models\Equipment;
use App\Models\OilActionPlanItem;
use App\Models\OilSample;
use App\Models\OilSamplingPoint;
use App\Models\Vessel;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Carrega a planilha "Ferramenta de Gestão de Análise de Óleo" no banco, a
 * partir do JSON gerado por src/AnaliseOleo/extrair_analise_oleo.py.
 *
 * Idempotente -- pode rodar de novo quando a planilha for atualizada:
 *  - ponto de coleta: casa por (embarcação, aba); atualiza nome/família/limites.
 *    O vínculo com o cadastro só é preenchido se ainda estiver vazio (um ajuste
 *    feito no sistema não é desfeito).
 *  - amostra: casa por (ponto, nº, data). Só mexe nas que vieram da planilha e
 *    nunca toca em parecer/ação da equipe.
 *  - plano de ação: cria só o que ainda não existe. Um item que a equipe já
 *    arquivou não volta a ser vigente.
 */
class ImportOilAnalysis extends Command
{
    protected $signature = 'oil-analysis:import
        {--arquivo= : Caminho do JSON (padrão: src/AnaliseOleo/analise_oleo.json)}
        {--dry-run : Só mostra o que faria, sem gravar}';

    protected $description = 'Importa a planilha de Análise de Óleo (pontos, amostras e plano de ação) para o banco';

    private const CONDICAO = ['Normal' => 'normal', 'Atenção' => 'atencao', 'Intervir' => 'intervir'];

    /**
     * TAGs da planilha que não batem com o cadastro e precisam de apelido
     * (conferido contra a base): CM1 escreve "CMI-" onde o cadastro usa
     * "CM01-"; motores BB/BE do CM1 são um equipamento só; o MCA do CM1 está
     * no sistema SEE; o MCP do AS ganhou sufixo 01.
     */
    private const APELIDOS = [
        'CMI-SPP-MCPBB' => ['CM01-SPP-MCPBB/BE'],
        'CMI-SPP-MCPBE' => ['CM01-SPP-MCPBB/BE'],
        'CMI-SMP-MCABB' => ['CM01-SEE-MCABB/BE'],
        'CMI-SMP-MCABE' => ['CM01-SEE-MCABB/BE'],
        'AS01-SPP-MCP' => ['AS01-SPP-MCP01'],
    ];

    private array $contagem = [];

    public function handle(): int
    {
        $arquivo = $this->option('arquivo') ?: base_path('src/AnaliseOleo/analise_oleo.json');
        if (! is_file($arquivo)) {
            $this->error("Arquivo não encontrado: {$arquivo}");

            return self::FAILURE;
        }

        $dados = json_decode(file_get_contents($arquivo), true);
        if (! is_array($dados) || empty($dados['equipamentos'])) {
            $this->error('JSON inválido ou sem equipamentos.');

            return self::FAILURE;
        }

        $vessels = Vessel::all()->keyBy('tag');
        $dryRun = (bool) $this->option('dry-run');

        DB::beginTransaction();
        try {
            $pontosPorChave = [];
            foreach ($dados['equipamentos'] as $eq) {
                $vessel = $vessels->get($eq['embarcacao']);
                if (! $vessel) {
                    $this->warn("Embarcação {$eq['embarcacao']} não cadastrada -- {$eq['id']} ignorado.");
                    continue;
                }
                $ponto = $this->importarPonto($vessel, $eq);
                $pontosPorChave["{$eq['embarcacao']}|{$eq['id']}"] = $ponto;

                foreach ($eq['amostras'] ?? [] as $amostra) {
                    $this->importarAmostra($ponto, $amostra);
                }
            }

            foreach (['planosAcao' => 'vigente', 'historicoPlanosAcao' => 'arquivado'] as $chave => $status) {
                foreach ($dados[$chave] ?? [] as $tagEmbarcacao => $itens) {
                    $vessel = $vessels->get($tagEmbarcacao);
                    if (! $vessel) {
                        continue;
                    }
                    foreach ($itens as $item) {
                        $ponto = $item['equipamentoId'] ? ($pontosPorChave["{$tagEmbarcacao}|{$item['equipamentoId']}"] ?? null) : null;
                        $this->importarItemPlano($vessel, $ponto, $item, $status);
                    }
                }
            }

            $dryRun ? DB::rollBack() : DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        $this->table(['Item', 'Quantidade'], collect($this->contagem)->map(fn ($v, $k) => [$k, $v])->values()->all());
        $this->info($dryRun ? 'Dry-run: nada foi gravado.' : 'Importação concluída.');

        return self::SUCCESS;
    }

    private function contar(string $item): void
    {
        $this->contagem[$item] = ($this->contagem[$item] ?? 0) + 1;
    }

    private function importarPonto(Vessel $vessel, array $eq): OilSamplingPoint
    {
        $ponto = OilSamplingPoint::firstOrNew(['vessel_id' => $vessel->id, 'sheet_key' => $eq['id']]);
        $novo = ! $ponto->exists;

        $ponto->fill([
            'sheet_tag' => trim($eq['tag']),
            'name' => $eq['nome'],
            'family' => $eq['familia'],
            'limits' => $eq['limites'] ?? null,
        ]);

        if (! $ponto->equipment_id) {
            $ponto->equipment_id = $this->equipamentoDoSistema($vessel, $eq['tag'])?->id;
        }
        $ponto->save();

        $this->contar($novo ? 'Pontos de coleta criados' : 'Pontos de coleta atualizados');
        $this->contar($ponto->equipment_id ? 'Pontos ligados ao cadastro' : 'Pontos sem equipamento no cadastro');

        return $ponto;
    }

    private function equipamentoDoSistema(Vessel $vessel, string $tagPlanilha): ?Equipment
    {
        $normalizar = fn (?string $t) => strtoupper(preg_replace('/\s+/', '', (string) $t));
        $tag = $normalizar($tagPlanilha);
        $candidatos = array_unique([$tag, preg_replace('/^CMI-/', 'CM01-', $tag), ...(self::APELIDOS[$tag] ?? [])]);

        $equipamentos = Equipment::where('vessel_id', $vessel->id)->get(['id', 'tag_number', 'tag_antigo']);
        foreach ($candidatos as $c) {
            // tag_antigo primeiro (base já migrada pra árvore nova), depois tag_number.
            $achado = $equipamentos->first(fn ($e) => $normalizar($e->tag_antigo) === $c)
                ?? $equipamentos->first(fn ($e) => $normalizar($e->tag_number) === $c);
            if ($achado) {
                return $achado;
            }
        }

        return null;
    }

    private function importarAmostra(OilSamplingPoint $ponto, array $a): void
    {
        // Data comparada por whereDate: o valor gravado pode vir com hora
        // conforme o banco, e '=' com 'aaaa-mm-dd' falharia em silêncio.
        $amostra = OilSample::where('oil_sampling_point_id', $ponto->id)
            ->where('sample_number', (int) $a['numero'])
            ->when($a['dataColeta'], fn ($q, $d) => $q->whereDate('collected_at', $d), fn ($q) => $q->whereNull('collected_at'))
            ->first()
            ?? new OilSample([
                'oil_sampling_point_id' => $ponto->id,
                'sample_number' => (int) $a['numero'],
                'collected_at' => $a['dataColeta'],
            ]);

        if ($amostra->exists && $amostra->source !== 'planilha') {
            $this->contar('Amostras lançadas no sistema (mantidas)');

            return;
        }

        $novo = ! $amostra->exists;
        $amostra->fill([
            'laboratory' => $a['laboratorio'] ?? null,
            'product' => $a['produto'] ?? null,
            'nominal_viscosity' => $a['viscosidadeNominal'] ?? null,
            'volume' => $a['volume'] ?? null,
            'service_hours' => $a['horasServico'] ?? null,
            'top_up' => $a['reposicao'] ?? null,
            'oil_changed' => match ($a['produtoTrocado'] ?? null) { 'Sim' => true, 'Não' => false, default => null },
            'results' => $a['resultados'] ?? [],
            'condition' => self::CONDICAO[$a['condicao'] ?? ''] ?? null,
            'source' => 'planilha',
        ]);
        $amostra->save();

        $this->contar($novo ? 'Amostras criadas' : 'Amostras atualizadas');
    }

    private function importarItemPlano(Vessel $vessel, ?OilSamplingPoint $ponto, array $i, string $status): void
    {
        // Identidade de um item da planilha: embarcação + TAG + data + texto.
        $chave = [
            'vessel_id' => $vessel->id,
            'source' => 'planilha',
            'sheet_tag' => $i['tag'],
            'action' => $i['acao'],
            'notes' => $i['observacoes'],
        ];
        $existe = OilActionPlanItem::where($chave)
            ->when($i['dataColeta'], fn ($q, $d) => $q->whereDate('collected_at', $d), fn ($q) => $q->whereNull('collected_at'))
            ->exists();
        if ($existe) {
            $this->contar('Itens de plano já existentes');

            return;
        }

        // Ponto que já tem item vigente gerado pelo sistema: o da planilha entra no histórico.
        if ($status === 'vigente' && $ponto && OilActionPlanItem::where('oil_sampling_point_id', $ponto->id)->where('status', 'vigente')->exists()) {
            $status = 'arquivado';
        }

        OilActionPlanItem::create([
            ...$chave,
            'collected_at' => $i['dataColeta'],
            'oil_sampling_point_id' => $ponto?->id,
            'equipment_name' => $i['equipamento'],
            'frequency_months' => $i['frequenciaMeses'],
            'frequency_hours' => $i['frequenciaHoras'],
            'next_collection_at' => $i['dataProximaColeta'],
            'hour_meter' => $i['horimetroAtual'],
            'next_hour_meter' => $i['horimetroProximaColeta'],
            'condition' => self::CONDICAO[$i['condicao'] ?? ''] ?? null,
            'responsible' => $i['responsaveis'],
            'deadline' => $i['prazo'],
            'status' => $status,
            'archived_at' => $status === 'arquivado' ? now() : null,
        ]);

        $this->contar($status === 'vigente' ? 'Itens de plano vigentes criados' : 'Itens de histórico criados');
    }
}
