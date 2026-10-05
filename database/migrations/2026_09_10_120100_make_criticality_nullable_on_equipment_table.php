<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A metodologia de criticidade (matriz A/B/C do estagiário) ainda está
     * em estudo -- até fechar, o equipamento precisa poder ficar sem
     * classificação em vez de forçar "Classe A" por padrão (era o default
     * antigo da coluna, o que mentia sobre equipamento nunca avaliado).
     *
     * A coluna já é varchar + CHECK ('A','B','C') (é assim que o Laravel
     * emula enum no Postgres) -- um CHECK não barra NULL sozinho, só a
     * constraint NOT NULL barra, então só ela (e o default) precisam sair.
     * Uso SQL puro porque o ->change() do Laravel pra enum no Postgres
     * gera um ALTER TABLE com sintaxe inválida (bug conhecido).
     */
    public function up(): void
    {
        // SQLite (testes) não tem ALTER COLUMN; lá o Laravel recria a tabela.
        if (DB::getDriverName() !== 'pgsql') {
            Schema::table('equipment', function (Blueprint $table) {
                $table->string('criticality')->nullable()->default(null)->change();
            });

            return;
        }

        DB::statement('ALTER TABLE equipment ALTER COLUMN criticality DROP NOT NULL');
        DB::statement('ALTER TABLE equipment ALTER COLUMN criticality DROP DEFAULT');
    }

    public function down(): void
    {
        DB::statement("UPDATE equipment SET criticality = 'A' WHERE criticality IS NULL");

        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement("ALTER TABLE equipment ALTER COLUMN criticality SET DEFAULT 'A'");
        DB::statement('ALTER TABLE equipment ALTER COLUMN criticality SET NOT NULL');
    }
};
