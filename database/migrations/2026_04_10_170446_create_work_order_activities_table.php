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
        Schema::create('work_order_activity', function (Blueprint $table) {
            $table->uuid('id')->primary();
            
            // Chaves estrangeiras
            $table->foreignUuid('work_order_id')->constrained('work_orders')->cascadeOnDelete();
            $table->foreignUuid('responsible_user_id')->constrained('users')->cascadeOnDelete();
            
            $table->text('description');
            $table->timestamp('started_at');
            $table->timestamp('completed_at')->nullable();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_order_activities');
    }
};
