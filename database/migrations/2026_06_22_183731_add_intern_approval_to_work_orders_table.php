<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::table('work_orders', function (Blueprint $table) {
            // Só cria a coluna se ela ainda não existir
            if (!Schema::hasColumn('work_orders', 'intern_status')) {
                $table->string('intern_status')->default('pending')->after('status');
            }
            
            // Faz o mesmo para a coluna de motivo
            if (!Schema::hasColumn('work_orders', 'intern_reason')) {
                $table->text('intern_reason')->nullable()->after('intern_status');
            }
        });
    }
};
