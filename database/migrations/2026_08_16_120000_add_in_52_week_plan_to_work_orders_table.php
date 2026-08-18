<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Marca quais OS fazem parte do Plano de 52 Semanas (o cronograma anual
     * de manutenção preventiva importado das planilhas de cada embarcação),
     * separando-as das OS avulsas criadas no dia a dia (corretivas de
     * quebra, preditivas pontuais, etc).
     *
     * O nome da coluna evita "annual" de propósito: `periodicity` já usa
     * 'annual' com outro sentido (a tarefa se repete uma vez por ano), e
     * uma OS do plano de 52 semanas pode ter qualquer periodicidade.
     */
    public function up(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->boolean('in_52_week_plan')->default(false)->after('periodicity');
        });
    }

    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropColumn('in_52_week_plan');
        });
    }
};
