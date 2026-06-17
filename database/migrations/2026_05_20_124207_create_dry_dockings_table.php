<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dry_dockings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('vessel_id')->constrained('vessels')->cascadeOnDelete();
            
            $table->string('shipyard')->nullable();
            
            $table->date('planned_start_date');
            $table->date('planned_end_date');
            $table->date('actual_start_date')->nullable();
            $table->date('actual_end_date')->nullable();
            
            $table->decimal('budget', 15, 2)->nullable();
            $table->decimal('actual_cost', 15, 2)->nullable();
            
            $table->enum('status', ['planning', 'quoting', 'in_progress', 'completed', 'cancelled'])->default('planning');
            $table->text('notes')->nullable();
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dry_dockings');
    }
};