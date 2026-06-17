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
        Schema::create('dry_docking_phases', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('dry_docking_id')->constrained('dry_dockings')->cascadeOnDelete();
            
            $table->string('name'); // Ex: "Semana 1 - Içamento e Lavagem"
            $table->date('start_date');
            $table->date('end_date');
            $table->integer('order_index')->default(0); // Para ordenar cronologicamente
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dry_docking_phases');
    }
};
