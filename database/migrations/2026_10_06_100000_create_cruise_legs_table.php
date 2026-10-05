<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Plano de cruzeiro: uma linha por etapa (a planilha usa duas linhas,
     * "Início - área" e "Fim - área"; aqui é um registro só com o intervalo).
     *
     *   Etapa 01 | Oceânico Sul | 21/09 | 03/10 | RG | RG
     *
     * Substitui os arquivos storage/app/cruise-plans/{tag}.json, que eram
     * placeholder aleatório. É o que o calendário de OS hachura como
     * "embarcação em cruzeiro".
     */
    public function up(): void
    {
        Schema::create('cruise_legs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('vessel_id')->constrained('vessels')->cascadeOnDelete();

            $table->unsignedSmallInteger('leg_number')->comment('Nº da etapa (Etapa 01, 02...)');
            $table->string('area')->comment('Área de operação, ex.: Oceânico Sul');
            $table->date('starts_at');
            $table->date('ends_at');
            $table->string('embark_port')->comment('Porto de embarque, ex.: RG, Itajaí');
            $table->string('disembark_port')->comment('Porto de desembarque');
            $table->text('notes')->nullable();

            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['vessel_id', 'starts_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cruise_legs');
    }
};
