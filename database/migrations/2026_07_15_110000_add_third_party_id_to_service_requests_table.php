<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Vincula a Solicitação de Serviço à empresa terceirizada responsável.
     * Nulo = SS interna (sem terceiro).
     */
    public function up(): void
    {
        Schema::table('service_requests', function (Blueprint $table) {
            $table->foreignUuid('third_party_id')->nullable()->after('vendor_name')
                ->constrained('third_parties')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('service_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('third_party_id');
        });
    }
};
