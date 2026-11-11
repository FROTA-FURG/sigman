<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Histórico da OS: quem fez o quê no planejamento e na execução -- checagem
 * do estagiário (aguardar/aprovar/voltar a pendente), observações, comentário
 * do engenheiro, disparo, mudança de status e inativação/reprogramação.
 * Guarda o cargo de quem agiu naquele momento (estagiário x engenheiro) e o
 * texto que cada um escreveu, sem sobrescrever o anterior.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_order_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('work_order_id')->constrained('work_orders')->cascadeOnDelete();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('user_name', 120)->nullable();   // nome na hora (sobrevive à exclusão do usuário)
            $table->string('user_role', 30)->nullable();    // cargo na hora: intern, engineer...
            $table->string('action', 40);                   // checagem, observacao, comentario_engenheiro, disparo, status, inativacao, reprogramada_de
            $table->string('from_value', 120)->nullable();
            $table->string('to_value', 120)->nullable();
            $table->text('note')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['work_order_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_order_events');
    }
};
