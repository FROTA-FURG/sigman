<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Inativar uma OS do plano: o engenheiro decide que aquela ocorrência
     * específica não vai acontecer na data marcada, e o sistema reprograma
     * automaticamente (conforme a periodicidade, ou pra uma nova data
     * escolhida por ele).
     *
     * Fica como flag (`is_inactive`), não como novo valor de `status` --
     * pra "sai das métricas igual ao cancelled" ser garantido sem reescrever
     * cada tela que já checa `status !== 'cancelled'`, a OS inativada também
     * recebe status = 'cancelled'. A flag existe pra diferenciar na
     * interface "cancelada de vez" de "cancelada porque foi reprogramada" --
     * e pra guardar quem/quando/por quê.
     *
     * `rescheduled_from_id` fica na OS NOVA, apontando pra OS antiga que ela
     * substituiu -- assim dá pra abrir a OS nova e ver de onde ela veio, e
     * abrir a antiga e (por query reversa) ver o que a substituiu.
     */
    public function up(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->boolean('is_inactive')->default(false)->after('status');
            $table->timestamp('inactivated_at')->nullable()->after('is_inactive');
            $table->foreignUuid('inactivated_by')->nullable()->after('inactivated_at')
                ->constrained('users')->nullOnDelete();
            $table->text('inactivation_reason')->nullable()->after('inactivated_by');
            $table->foreignUuid('rescheduled_from_id')->nullable()->after('inactivation_reason')
                ->constrained('work_orders')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('rescheduled_from_id');
            $table->dropConstrainedForeignId('inactivated_by');
            $table->dropColumn(['is_inactive', 'inactivated_at', 'inactivation_reason']);
        });
    }
};
