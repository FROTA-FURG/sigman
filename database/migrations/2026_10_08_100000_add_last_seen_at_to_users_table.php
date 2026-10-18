<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Visto por último": momento da última requisição autenticada do
     * usuário (gravado pelo middleware TrackLastSeen). Vale pra todos os
     * perfis; quem pode VER é só dev/coordenador/engenheiro (UserController).
     *
     * last_logout_at: quando saiu pelo "Sair". Sem ele, quem acabou de sair
     * continuaria "online" até a janela de 5 minutos passar.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('last_seen_at')->nullable()->after('status');
            $table->timestamp('last_logout_at')->nullable()->after('last_seen_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['last_seen_at', 'last_logout_at']);
        });
    }
};
