<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Equipment;
use App\Models\Vessel;

class ImportEquipments extends Command
{
    protected $signature = 'import:equipments {filepath} {vessel_id}';
    protected $description = 'Importa a árvore de equipamentos a partir de um CSV';

    public function handle()
    {
        $filepath = $this->argument('filepath');
        $vesselId = $this->argument('vessel_id');

        if (!file_exists($filepath)) {
            $this->error("Arquivo não encontrado: {$filepath}");
            return;
        }

        $vessel = Vessel::find($vesselId);
        if (!$vessel) {
            $this->error("Embarcação não encontrada com o ID: {$vesselId}");
            return;
        }

        $file = fopen($filepath, 'r');
        $header = fgetcsv($file); // Pula a primeira linha (cabeçalho)

        $this->info("Iniciando importação para a embarcação {$vessel->name}...");

        // Array para guardar os IDs dos pais enquanto lemos a planilha
        // Assumindo que sua planilha tem uma coluna com o "Nó Pai" ou que segue uma ordem sequencial
        $parents = []; 

        while (($row = fgetcsv($file)) !== false) {
            // ATENÇÃO: Ajuste os índices numéricos ($row[0], $row[1]) para baterem
            // exatamente com as colunas do seu arquivo CSV.
            // Ex: $row[0] = TAG, $row[1] = NOME, $row[2] = PARENT_TAG...

            $tag = $row[0] ?? null;
            $name = $row[1] ?? 'Equipamento Sem Nome';
            $parentTag = $row[2] ?? null; 

            // Se tem um parentTag, busca o ID dele no banco para fazer a ligação
            $parentId = null;
            if ($parentTag) {
                $parentEquipment = Equipment::where('tag_number', $parentTag)->first();
                $parentId = $parentEquipment ? $parentEquipment->id : null;
            }

            Equipment::updateOrCreate(
                ['tag_number' => $tag, 'vessel_id' => $vesselId], // Condição para não duplicar
                [
                    'name' => $name,
                    'parent_id' => $parentId,
                    'status' => 'Operacional', // Status padrão
                    // Adicione os outros campos aqui mapeando com o $row
                ]
            );
        }

        fclose($file);
        $this->info('Importação concluída com sucesso!');
    }
}