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
        Schema::create('work_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            
            // Chave estrangeira ligando ao equipamento
            $table->foreignUuid('equipment_id')->constrained('equipment')->cascadeOnDelete();
            
            $table->string('os_number')->unique()->nullable();
            $table->string('tag_number')->nullable();
            $table->string('series_number_id')->nullable();
            $table->text('description');
            $table->string('model')->nullable();
            $table->string('manufacturer')->nullable();
            
            $table->enum('maintenance_type', ['corrective', 'preventive', 'predictive']);
            $table->enum('priority', ['low', 'medium', 'high', 'critical']);
            $table->enum('status', ['open', 'in_progress', 'completed', 'cancelled'])->default('open');
            $table->string('vendor_name')->nullable();
            
            $table->timestamp('completed_at')->nullable();
            $table->timestamps(); // Cria o created_at e updated_at
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_orders');
    }
};
