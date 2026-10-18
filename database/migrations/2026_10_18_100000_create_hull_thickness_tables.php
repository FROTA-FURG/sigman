<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Medição de Espessura de chapas do casco (ultrassom).
     *
     *   hull_regions            -> partes do casco por embarcação (bombordo,
     *                              boreste, conveses, anteparas, espelho). O
     *                              quadro de coordenadas nasce com a 1ª imagem.
     *   hull_region_images      -> histórico de imagens de cada região (nunca
     *                              apaga; replaced_at marca a saída de uso).
     *   hull_plates             -> chapas, com E.P. e o contorno desenhado.
     *   thickness_campaigns     -> campanhas de medição (2018, 2022, 2024...).
     *   thickness_readings      -> uma linha por ponto medido.
     *   hull_plate_replacements -> trocas de chapa (tendência recomeça).
     *
     * Taxa de corrosão, vida residual e status são sempre calculados.
     * Carga da planilha: php artisan hull-thickness:import.
     */
    public function up(): void
    {
        Schema::create('hull_regions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('vessel_id')->constrained('vessels')->cascadeOnDelete();
            $table->string('code', 10)->comment('BB | BE | CC | CP | AV | AR | EP');
            $table->string('name');
            $table->unsignedSmallInteger('plate_count')->comment('Chapas previstas no desenho');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->decimal('frame_width', 10, 2)->nullable()->comment('Quadro de coordenadas (definido pela 1ª imagem)');
            $table->decimal('frame_height', 10, 2)->nullable();
            $table->uuid('current_image_id')->nullable()->comment('Imagem em uso');
            $table->foreignUuid('image_updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('image_updated_at')->nullable();
            $table->timestamps();

            $table->unique(['vessel_id', 'code']);
        });

        Schema::create('hull_region_images', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('hull_region_id')->constrained('hull_regions')->cascadeOnDelete();
            $table->string('path');
            $table->string('original_name');
            $table->unsignedBigInteger('size');
            $table->unsignedInteger('width_px');
            $table->unsignedInteger('height_px');
            $table->decimal('x', 12, 3)->comment('Posição/escala no quadro da região');
            $table->decimal('y', 12, 3);
            $table->decimal('width', 12, 3);
            $table->decimal('height', 12, 3);
            $table->decimal('scale', 6, 3)->default(1);
            $table->foreignUuid('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('uploaded_at');
            $table->foreignUuid('positioned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('positioned_at')->nullable();
            $table->timestamp('replaced_at')->nullable()->comment('Saiu de uso (null = em uso)');
            $table->foreignUuid('removed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // FK circular região -> imagem atual (o SQLite dos testes não altera FK depois de criada a tabela).
        if (DB::getDriverName() !== 'sqlite') {
            Schema::table('hull_regions', function (Blueprint $table) {
                $table->foreign('current_image_id')->references('id')->on('hull_region_images')->nullOnDelete();
            });
        }

        Schema::create('hull_plates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('hull_region_id')->constrained('hull_regions')->cascadeOnDelete();
            $table->unsignedSmallInteger('number');
            $table->string('plate_type', 30)->nullable()->comment('Fundo | Costado | Piso | Antepara | Espelho');
            $table->decimal('design_thickness_mm', 5, 2)->nullable()->comment('Espessura de projeto (E.P.)');
            $table->decimal('area_m2', 6, 2)->nullable();
            $table->json('contour')->nullable()->comment('[[x,y],...] no quadro da região; null = não mapeada');
            $table->foreignUuid('contour_updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('contour_updated_at')->nullable();
            $table->string('source_ref')->nullable()->comment('Origem na planilha, ex.: AS_BE · chapa 34');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['hull_region_id', 'number']);
        });

        Schema::create('thickness_campaigns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('vessel_id')->constrained('vessels')->cascadeOnDelete();
            $table->date('measured_at');
            $table->foreignUuid('dry_docking_id')->nullable()->constrained('dry_dockings')->nullOnDelete();
            $table->foreignUuid('third_party_id')->nullable()->constrained('third_parties')->nullOnDelete();
            $table->string('inspector_name')->nullable();
            $table->string('inspector_qualification')->nullable()->comment('ISO 9712');
            $table->string('instrument')->nullable();
            $table->date('instrument_calibrated_at')->nullable();
            $table->string('report_path')->nullable();
            $table->string('report_original_name')->nullable();
            $table->enum('source', ['planilha', 'manual'])->default('manual');
            $table->text('notes')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['vessel_id', 'measured_at']);
        });

        Schema::create('thickness_readings', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('thickness_campaign_id')->constrained('thickness_campaigns')->cascadeOnDelete();
            $table->foreignUuid('hull_plate_id')->constrained('hull_plates')->cascadeOnDelete();
            $table->unsignedSmallInteger('point_number');
            $table->decimal('thickness_mm', 5, 2);

            $table->unique(['thickness_campaign_id', 'hull_plate_id', 'point_number'], 'thickness_readings_campanha_chapa_ponto');
            $table->index('hull_plate_id');
        });

        Schema::create('hull_plate_replacements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('hull_plate_id')->constrained('hull_plates')->cascadeOnDelete();
            $table->date('replaced_at');
            $table->foreignUuid('dry_docking_id')->nullable()->constrained('dry_dockings')->nullOnDelete();
            $table->decimal('new_thickness_mm', 5, 2)->nullable();
            $table->text('notes')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hull_plate_replacements');
        Schema::dropIfExists('thickness_readings');
        Schema::dropIfExists('thickness_campaigns');
        Schema::dropIfExists('hull_plates');
        if (DB::getDriverName() !== 'sqlite') {
            Schema::table('hull_regions', fn (Blueprint $table) => $table->dropForeign(['current_image_id']));
        }
        Schema::dropIfExists('hull_region_images');
        Schema::dropIfExists('hull_regions');
    }
};
