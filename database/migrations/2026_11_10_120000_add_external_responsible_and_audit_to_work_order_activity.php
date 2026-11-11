<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Atividade da OS:
 *  - o responsável pode ser alguém de fora do sistema (só o nome digitado),
 *    então responsible_user_id passa a aceitar nulo e entra responsible_name;
 *  - created_by / updated_by registram quem lançou e quem alterou por último
 *    (não é o responsável: o técnico externo executa, o estagiário lança).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('work_order_activity', function (Blueprint $table) {
            $table->uuid('responsible_user_id')->nullable()->change();
            $table->string('responsible_name', 120)->nullable()->after('responsible_user_id');
            $table->foreignUuid('created_by')->nullable()->after('completed_at')->constrained('users')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('work_order_activity', function (Blueprint $table) {
            $table->dropConstrainedForeignId('updated_by');
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn('responsible_name');
        });
        // responsible_user_id volta a NOT NULL só se não houver atividade de externo.
    }
};
