<?php

namespace App\Console\Commands;

use App\Models\HullPlate;
use App\Models\HullRegion;
use App\Models\ThicknessCampaign;
use App\Models\ThicknessReading;
use App\Models\Vessel;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Carrega a planilha "Controle de espessura" no banco, a partir do JSON
 * gerado por src/MedicaoEspessura/extrair_medicoes.py.
 *
 * Só os VALORES: regiões (de config/hull_thickness.php), chapas com E.P. e
 * tipo, campanhas e leituras. Desenhos, molduras e contornos são feitos no
 * sistema (Mapeamento) e nunca são tocados aqui.
 *
 * Idempotente: chapa casa por (região, nº); campanha por (embarcação, data);
 * leitura por (campanha, chapa, ponto). Rodar de novo atualiza valores.
 */
class ImportHullThickness extends Command
{
    protected $signature = 'hull-thickness:import
        {--arquivo= : Caminho do JSON (padrão: src/MedicaoEspessura/medicoes.json)}
        {--dry-run : Só mostra o que faria, sem gravar}';

    protected $description = 'Importa as medições de espessura de chapas (planilha) para o banco';

    private array $contagem = [];

    public function handle(): int
    {
        $arquivo = $this->option('arquivo') ?: base_path('src/MedicaoEspessura/medicoes.json');
        if (! is_file($arquivo)) {
            $this->error("Arquivo não encontrado: {$arquivo}");

            return self::FAILURE;
        }
        $dados = json_decode(file_get_contents($arquivo), true);
        if (! is_array($dados)) {
            $this->error('JSON inválido.');

            return self::FAILURE;
        }

        $tags = config('hull_thickness.tag_da_planilha');
        $dryRun = (bool) $this->option('dry-run');

        DB::beginTransaction();
        try {
            foreach ($dados as $chave => $emb) {
                $tag = $tags[$chave] ?? $chave;
                $vessel = Vessel::where('tag', $tag)->first();
                if (! $vessel) {
                    $this->warn("Embarcação {$tag} não cadastrada -- ignorada.");
                    continue;
                }
                $this->importarEmbarcacao($vessel, $emb);
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

    private function contar(string $item, int $n = 1): void
    {
        $this->contagem[$item] = ($this->contagem[$item] ?? 0) + $n;
    }

    private function importarEmbarcacao(Vessel $vessel, array $emb): void
    {
        // Ano de construção do casco (base da TC norma), conforme os artigos.
        $construcao = config("hull_thickness.construcao.{$vessel->tag}");
        if ($construcao && (int) $vessel->year !== $construcao) {
            $this->line("  {$vessel->tag}: ano de construção {$vessel->year} -> {$construcao}");
            $vessel->update(['year' => $construcao]);
        }

        // Regiões (só cria/atualiza nome e nº de chapas; quadro e imagem são do sistema).
        $regioes = [];
        $ordem = 0;
        foreach (config("hull_thickness.regioes.{$vessel->tag}", []) as $code => [$nome, $chapas]) {
            $regiao = HullRegion::firstOrNew(['vessel_id' => $vessel->id, 'code' => $code]);
            $this->contar($regiao->exists ? 'Regiões existentes' : 'Regiões criadas');
            $regiao->fill(['name' => $nome, 'plate_count' => $chapas, 'sort_order' => $ordem++])->save();
            $regioes[$code] = $regiao;
        }

        // Campanhas
        $campanhas = [];
        $notas = implode("\n", $emb['observacoes'] ?? []) ?: null;
        foreach ($emb['campanhas'] ?? [] as $c) {
            $campanha = ThicknessCampaign::where('vessel_id', $vessel->id)->whereDate('measured_at', $c['data'])->first()
                ?? new ThicknessCampaign(['vessel_id' => $vessel->id, 'measured_at' => $c['data']]);
            $this->contar($campanha->exists ? 'Campanhas existentes' : 'Campanhas criadas');
            if (! $campanha->exists || $campanha->source === 'planilha') {
                $campanha->fill(['source' => 'planilha', 'notes' => $notas])->save();
            }
            $campanhas[$c['id']] = $campanha;
        }

        // Chapas e leituras
        foreach ($emb['chapas'] ?? [] as $chave => $ch) {
            [$code, $numero] = explode('-', $chave);
            $regiao = $regioes[$code] ?? null;
            if (! $regiao) {
                $this->warn("  {$vessel->tag}: região {$code} não configurada -- chapa {$chave} ignorada.");
                continue;
            }
            $chapa = HullPlate::firstOrNew(['hull_region_id' => $regiao->id, 'number' => (int) $numero]);
            $this->contar($chapa->exists ? 'Chapas atualizadas' : 'Chapas criadas');
            // Só os valores da planilha: o contorno desenhado no sistema é preservado.
            $chapa->fill([
                'design_thickness_mm' => $ch['ep'],
                'plate_type' => $ch['tipo'] ?? $chapa->plate_type,
                'source_ref' => $ch['origem'] ?? null,
            ])->save();

            foreach ($ch['medicoes'] ?? [] as $campanhaId => $pontos) {
                $campanha = $campanhas[$campanhaId] ?? null;
                if (! $campanha || $campanha->source !== 'planilha') {
                    continue; // campanha lançada no sistema: não sobrescreve
                }
                foreach (array_values($pontos) as $i => $valor) {
                    if ($valor === null) {
                        continue;
                    }
                    ThicknessReading::updateOrCreate(
                        ['thickness_campaign_id' => $campanha->id, 'hull_plate_id' => $chapa->id, 'point_number' => $i + 1],
                        ['thickness_mm' => $valor],
                    );
                    $this->contar('Leituras gravadas');
                }
            }
        }
    }
}
