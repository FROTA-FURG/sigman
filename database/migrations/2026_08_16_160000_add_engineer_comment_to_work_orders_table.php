<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Observação do engenheiro sobre a OS.
     *
     * Contraparte do `intern_reason` (a observação do estagiário na
     * validação prévia): o estagiário registra o que falta, o engenheiro
     * responde/orienta antes de disparar. Fica na própria OS, e não em
     * work_order_activities, porque activities é o registro de execução do
     * serviço — este comentário é do planejamento, anterior ao disparo.
     */
    public function up(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->text('engineer_comment')->nullable()->after('intern_name');
            $table->string('engineer_comment_by')->nullable()->after('engineer_comment');
            $table->timestamp('engineer_comment_at')->nullable()->after('engineer_comment_by');
        });
    }

    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropColumn(['engineer_comment', 'engineer_comment_by', 'engineer_comment_at']);
        });
    }
};
