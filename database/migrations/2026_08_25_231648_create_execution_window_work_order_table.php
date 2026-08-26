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
     * Vínculo OS <-> Janela de Execução, com histórico: a linha nunca é
     * apagada quando a OS sai da janela, só marcada com removed_at/by --
     * assim dá pra saber de quais janelas uma OS já participou. Regra de
     * negócio (validada no controller): uma OS só pode estar em mais de
     * uma janela ativa (removed_at nulo) se as janelas não colidirem de data.
     */
    public function up(): void
    {
        Schema::create('execution_window_work_order', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('execution_window_id')->constrained('execution_windows')->cascadeOnDelete();
            $table->foreignUuid('work_order_id')->constrained('work_orders')->cascadeOnDelete();
            $table->foreignUuid('added_by')->constrained('users');
            $table->timestamp('added_at');
            $table->foreignUuid('removed_by')->nullable()->constrained('users');
            $table->timestamp('removed_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('execution_window_work_order');
    }
};
