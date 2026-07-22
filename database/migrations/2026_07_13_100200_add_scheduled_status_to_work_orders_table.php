<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * A tabela nasceu com um enum de status sem o 'scheduled', mas o sistema já grava
     * OS agendadas (botão "Confirmar Agendamento"). Aqui o CHECK do Postgres é recriado
     * incluindo 'scheduled', senão o agendamento estoura erro de constraint no banco.
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_status_check');
        DB::statement("ALTER TABLE work_orders ADD CONSTRAINT work_orders_status_check CHECK (status::text = ANY (ARRAY['open', 'in_progress', 'scheduled', 'completed', 'cancelled']::text[]))");
    }

    public function down(): void
    {
        // Volta ao enum antigo. As OS agendadas viram 'open' para não violar o CHECK.
        DB::statement("UPDATE work_orders SET status = 'open' WHERE status = 'scheduled'");
        DB::statement('ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_status_check');
        DB::statement("ALTER TABLE work_orders ADD CONSTRAINT work_orders_status_check CHECK (status::text = ANY (ARRAY['open', 'in_progress', 'completed', 'cancelled']::text[]))");
    }
};
