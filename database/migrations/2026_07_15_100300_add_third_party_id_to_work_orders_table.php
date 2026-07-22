<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Vincula a OS à empresa terceirizada responsável. Nulo = OS interna (sem terceiro).
     * É o que permite ao terceiro ver "as OS dele" de forma inequívoca.
     */
    public function up(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->foreignUuid('third_party_id')->nullable()->after('vendor_name')
                ->constrained('third_parties')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('third_party_id');
        });
    }
};
