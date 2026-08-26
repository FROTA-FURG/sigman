<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    /**
     * "Janela de Execução": um lote de OS agrupado numa janela de datas
     * escolhida conforme a disponibilidade da embarcação (fora do plano de
     * cruzeiro). Não muda a data-alvo (created_at) das OS -- só a data de
     * início real (started_at), que é a que reflete quando a equipe
     * realmente vai atacar aquele lote.
     */
    public function up(): void
    {
        Schema::create('execution_windows', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('vessel_id')->constrained('vessels');
            $table->date('start_date');
            $table->date('end_date');
            $table->foreignUuid('created_by')->constrained('users');
            $table->foreignUuid('updated_by')->nullable()->constrained('users');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('execution_windows');
    }
};
