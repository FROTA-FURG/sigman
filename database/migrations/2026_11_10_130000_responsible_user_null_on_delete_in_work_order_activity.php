<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Apagar um usuário de vez não pode levar junto as atividades que ele
 * executou (histórico de manutenção). A FK passa de CASCADE para SET NULL;
 * o nome é copiado para responsible_name antes (User::forceDeleting).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('work_order_activity', function (Blueprint $table) {
            $table->dropForeign(['responsible_user_id']);
            $table->foreign('responsible_user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('work_order_activity', function (Blueprint $table) {
            $table->dropForeign(['responsible_user_id']);
            $table->foreign('responsible_user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }
};
