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
        Schema::create('dry_docking_tasks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('dry_docking_phase_id')->constrained('dry_docking_phases')->cascadeOnDelete();
            
            $table->string('title'); // Ex: "Inspeção dos eixos"
            $table->text('description')->nullable();
            
            // As colunas do seu Jira
            $table->enum('status', ['todo', 'in_progress', 'blocked', 'done'])->default('todo');
            
            // Dados fundamentais para a Curva S (Gerenciamento de Valor Agregado - EVM)
            $table->decimal('planned_cost', 10, 2)->default(0); // Custo Orçado
            $table->decimal('actual_cost', 10, 2)->default(0);  // Custo Realizado
            $table->integer('weight_percentage')->default(1);   // Peso dessa atividade no total do projeto (1 a 100%)
            
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->foreignUuid('assigned_to')->nullable()->constrained('users'); // Quem vai fazer
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dry_docking_tasks');
    }
};
