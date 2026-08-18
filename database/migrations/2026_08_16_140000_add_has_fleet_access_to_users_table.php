<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Permite que um usuário responda por TODA a frota, e não por uma
     * embarcação só.
     *
     * Antes desta coluna, `vessel_id = NULL` era ambíguo: significava tanto
     * "sem embarcação" (o caso do terceiro) quanto "vê tudo" — porque as
     * telas que filtram por embarcação simplesmente pulavam o filtro quando
     * o campo vinha vazio. Com a flag, os três estados ficam explícitos:
     *
     *   has_fleet_access = true                  -> toda a frota
     *   has_fleet_access = false + vessel_id set -> aquela embarcação
     *   has_fleet_access = false + vessel_id NULL-> nenhuma embarcação
     *
     * Backfill preserva o comportamento atual: hoje quem enxerga a frota
     * inteira são os perfis dev e engineer (regra fixa em FutureOS.jsx), que
     * passa a ser lida desta coluna em vez de ser adivinhada pelo cargo.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('has_fleet_access')->default(false)->after('vessel_id');
        });

        DB::statement("
            UPDATE users SET has_fleet_access = true
            WHERE role_id IN (SELECT id FROM roles WHERE name IN ('dev', 'engineer'))
        ");
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('has_fleet_access');
        });
    }
};
