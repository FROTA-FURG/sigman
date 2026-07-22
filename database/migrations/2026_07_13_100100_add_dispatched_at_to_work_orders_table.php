<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            // Marca o momento em que a OS foi disparada e os responsáveis avisados.
            // Serve de trava: evita reenviar e-mail toda vez que o status for alterado de novo.
            $table->timestamp('dispatched_at')->nullable()->after('completed_at');
        });
    }

    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropColumn('dispatched_at');
        });
    }
};
