<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Etapa 1: Cria a tabela e as colunas
        Schema::create('equipment', function (Blueprint $table) {
            $table->uuid('id')->primary();
            
            // FK de embarcação pode ser criada direto, pois a tabela vessels já existe
            $table->foreignUuid('vessel_id')->constrained('vessels')->cascadeOnDelete();
            
            // Apenas cria a coluna parent_id (sem dizer que é FK ainda)
            $table->uuid('parent_id')->nullable(); 
            
            $table->string('series_number')->nullable();
            $table->string('tag_number');
            $table->string('name');
            $table->string('manufacturer')->nullable();
            $table->string('model')->nullable();
            $table->date('purchase_date')->nullable();
            $table->date('in_service_date')->nullable();
            
            $table->enum('criticality', ['A', 'B', 'C'])->default('A');
            $table->enum('status', ['active', 'inactive', 'in_maintenance', 'decommissioned'])->default('active');
            $table->binary('image_url')->nullable(); 
            
            $table->timestamps();
        });

        // Etapa 2: Adiciona a restrição (Foreign Key) na própria tabela agora que ela já existe e o ID está pronto
        Schema::table('equipment', function (Blueprint $table) {
            $table->foreign('parent_id')->references('id')->on('equipment')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('equipment');
    }
};
