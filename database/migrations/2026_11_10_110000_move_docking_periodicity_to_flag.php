<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * "Docagem" deixou de ser periodicidade e virou a flag is_docking. OS que
     * estavam com periodicity = 'docking' ganham a flag e ficam sem
     * periodicidade (docagem nunca teve intervalo de calendário, então nada
     * de reprogramação automática muda).
     */
    public function up(): void
    {
        DB::table('work_orders')
            ->where('periodicity', 'docking')
            ->update(['is_docking' => true, 'periodicity' => null]);
    }

    public function down(): void
    {
        // Sem volta exata: não dá para saber quais OS com is_docking eram
        // "periodicidade docagem" antes. Mantém como está.
    }
};
