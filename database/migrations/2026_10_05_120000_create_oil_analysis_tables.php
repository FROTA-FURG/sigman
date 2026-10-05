<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Análise de Óleo (manutenção preditiva de lubrificantes).
     *
     *   oil_sampling_points    -> ponto de coleta: o equipamento monitorado, a
     *                             família (motor/redutora/hidráulica) e os
     *                             limites de condenação. Liga opcionalmente ao
     *                             cadastro de equipment (pra gerar OS).
     *   oil_samples            -> cada coleta/laudo, com os resultados por
     *                             parâmetro (json: os parâmetros variam por
     *                             família -- catálogo em config/oil_analysis.php).
     *   oil_action_plan_items  -> Plano de Ação. Vigente e histórico na mesma
     *                             tabela (status): gerar um novo item arquiva o
     *                             anterior, como as abas "ARMAZ." da planilha.
     *   oil_analysis_reports   -> laudos em PDF submetidos em lote, guardados
     *                             até a leitura automática existir.
     *
     * Carga inicial: php artisan oil-analysis:import (planilha de gestão).
     */
    public function up(): void
    {
        Schema::create('oil_sampling_points', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('vessel_id')->constrained('vessels')->cascadeOnDelete();
            $table->foreignUuid('equipment_id')->nullable()->constrained('equipment')->nullOnDelete();

            $table->string('sheet_key')->comment('Identificador da aba na planilha (chave da importação)');
            $table->string('sheet_tag')->comment('TAG escrito na planilha (tag antigo do equipamento)');
            $table->string('name');
            $table->enum('family', ['motor', 'redutora', 'hidraulica']);
            $table->json('limits')->nullable()->comment('{amarelo:{}, vermelho:{}, verde?:{}} por parâmetro');

            $table->timestamps();

            $table->unique(['vessel_id', 'sheet_key']);
        });

        Schema::create('oil_samples', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('oil_sampling_point_id')->constrained('oil_sampling_points')->cascadeOnDelete();

            $table->unsignedInteger('sample_number');
            $table->string('laboratory')->nullable();
            $table->string('product')->nullable();
            $table->decimal('nominal_viscosity', 10, 2)->nullable();
            $table->decimal('volume', 10, 2)->nullable();
            $table->decimal('service_hours', 12, 2)->nullable();
            $table->decimal('top_up', 10, 2)->nullable();
            $table->boolean('oil_changed')->nullable();
            $table->date('collected_at')->nullable();
            $table->string('report_number')->nullable();

            $table->json('results')->comment('{parametro: valor}, chaves do catálogo da família');
            $table->enum('condition', ['normal', 'atencao', 'intervir'])->nullable();
            $table->text('lab_opinion')->nullable()->comment('Parecer do laboratório (texto do laudo)');
            $table->text('team_action')->nullable()->comment('Ação específica definida pela equipe');

            $table->enum('source', ['planilha', 'manual', 'pdf'])->default('manual');
            $table->string('report_path')->nullable()->comment('PDF do laudo no disco local');
            $table->string('report_original_name')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            $table->index(['oil_sampling_point_id', 'collected_at']);
        });

        Schema::create('oil_action_plan_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('vessel_id')->constrained('vessels')->cascadeOnDelete();
            $table->foreignUuid('oil_sampling_point_id')->nullable()->constrained('oil_sampling_points')->nullOnDelete();
            $table->foreignUuid('oil_sample_id')->nullable()->constrained('oil_samples')->nullOnDelete();

            $table->string('equipment_name');
            $table->string('sheet_tag')->nullable();
            $table->decimal('frequency_months', 5, 1)->nullable();
            $table->decimal('frequency_hours', 10, 1)->nullable();
            $table->date('collected_at')->nullable();
            $table->date('next_collection_at')->nullable();
            $table->decimal('hour_meter', 12, 1)->nullable();
            $table->decimal('next_hour_meter', 12, 1)->nullable();

            $table->enum('condition', ['normal', 'atencao', 'intervir'])->nullable();
            $table->text('action')->nullable();
            $table->text('notes')->nullable();
            $table->string('responsible')->nullable();
            $table->date('deadline')->nullable();
            $table->text('lab_opinion')->nullable();

            $table->enum('status', ['vigente', 'arquivado'])->default('vigente');
            $table->timestamp('archived_at')->nullable();
            $table->enum('source', ['planilha', 'amostra'])->default('amostra');
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            $table->index(['vessel_id', 'status']);
        });

        Schema::create('oil_analysis_reports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('vessel_id')->constrained('vessels')->cascadeOnDelete();
            $table->foreignUuid('oil_sample_id')->nullable()->constrained('oil_samples')->nullOnDelete();

            $table->string('path');
            $table->string('original_name');
            $table->unsignedBigInteger('size');
            $table->enum('status', ['aguardando_leitura', 'processado'])->default('aguardando_leitura');
            $table->foreignUuid('uploaded_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('oil_analysis_reports');
        Schema::dropIfExists('oil_action_plan_items');
        Schema::dropIfExists('oil_samples');
        Schema::dropIfExists('oil_sampling_points');
    }
};
