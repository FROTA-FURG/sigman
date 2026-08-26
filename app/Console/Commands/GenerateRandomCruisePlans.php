<?php

namespace App\Console\Commands;

use App\Models\Vessel;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class GenerateRandomCruisePlans extends Command
{
    protected $signature = 'cruise-plans:seed-random {--force : Sobrescreve os arquivos já existentes}';

    protected $description = 'Gera um plano de cruzeiro aleatório por embarcação (placeholder até termos a leitura do planejamento real, que vai produzir o JSON no mesmo formato)';

    private array $descricoes = [
        'Cruzeiro Oceanográfico',
        'Expedição de Pesquisa',
        'Cruzeiro de Coleta de Dados',
        'Embarque Acadêmico',
        'Cruzeiro de Monitoramento Costeiro',
        'Operação de Amostragem',
    ];

    public function handle(): int
    {
        $disk = Storage::disk('local');
        $disk->makeDirectory('cruise-plans');

        foreach (Vessel::all(['id', 'name', 'tag']) as $vessel) {
            $path = "cruise-plans/{$vessel->tag}.json";

            if ($disk->exists($path) && ! $this->option('force')) {
                $this->info("Já existe {$path} -- pulando (use --force pra sobrescrever).");
                continue;
            }

            $periodos = $this->gerarPeriodosAleatorios();
            $disk->put($path, json_encode($periodos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

            $this->info("Gerado {$path} com " . count($periodos) . " cruzeiro(s) para {$vessel->name}.");
        }

        return self::SUCCESS;
    }

    /** ~4 a 7 cruzeiros sem sobrepor, espalhados de 2 meses atrás até mais de um ano à frente. */
    private function gerarPeriodosAleatorios(): array
    {
        $periodos = [];
        $qtde = rand(4, 7);
        $cursor = Carbon::now()->subMonths(2)->startOfMonth();

        for ($i = 0; $i < $qtde; $i++) {
            $cursor->addDays(rand(10, 35)); // tempo em porto antes do próximo cruzeiro
            $inicio = $cursor->copy();
            $fim = $inicio->copy()->addDays(rand(3, 18));

            $periodos[] = [
                'inicio' => $inicio->format('Y-m-d'),
                'fim' => $fim->format('Y-m-d'),
                'descricao' => $this->descricoes[array_rand($this->descricoes)],
            ];

            $cursor = $fim->copy();
        }

        return $periodos;
    }
}
