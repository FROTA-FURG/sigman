<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Origem da OS, além do Plano de 52 Semanas (in_52_week_plan):
     *   is_docking        -> serviço da docagem;
     *   is_extra_activity -> atividade extra (fora do plano).
     * Podem ser combinadas, exceto plano de 52 semanas + atividade extra
     * (validado em WorkOrderController).
     *
     * updated_by: quem salvou a OS por último (preenchido pelo model a cada
     * gravação; null = alteração automática do sistema).
     */
    public function up(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->boolean('is_docking')->default(false)->after('in_52_week_plan');
            $table->boolean('is_extra_activity')->default(false)->after('is_docking');
            $table->foreignUuid('updated_by')->nullable()->after('approved_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('updated_by');
            $table->dropColumn(['is_docking', 'is_extra_activity']);
        });
    }
};
