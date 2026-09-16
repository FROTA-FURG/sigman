<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A árvore de equipamentos está sendo reclassificada conforme a ISO
     * 14224 (estudo do estagiário) -- o tag_number vai passar a ser o tag
     * novo dessa árvore. `tag_antigo` guarda o tag que estava em uso antes
     * da migração, pra manter rastreabilidade de qual TAG aparecia nas OS
     * antigas e em qualquer registro físico/impresso já existente.
     */
    public function up(): void
    {
        Schema::table('equipment', function (Blueprint $table) {
            $table->string('tag_antigo')->nullable()->after('tag_number');
        });
    }

    public function down(): void
    {
        Schema::table('equipment', function (Blueprint $table) {
            $table->dropColumn('tag_antigo');
        });
    }
};
