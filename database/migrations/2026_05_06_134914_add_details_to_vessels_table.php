<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('vessels', function (Blueprint $table) {
            // Adiciona a capacidade de tripulação
            $table->integer('crew_capacity')->nullable()->after('year');
            
            // Adiciona o status de navegação
            $table->string('navigation_status')->default('Atracada')->after('status');
        });
    }

    public function down()
    {
        Schema::table('vessels', function (Blueprint $table) {
            $table->dropColumn(['crew_capacity', 'navigation_status']);
        });
    }
};