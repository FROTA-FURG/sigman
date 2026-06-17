<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('service_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            
            // Chaves Estrangeiras (Relacionamentos)
            $table->foreignUuid('vessel_id')->constrained('vessels')->cascadeOnDelete();
            $table->foreignUuid('equipment_id')->nullable()->constrained('equipment')->nullOnDelete();
            $table->foreignUuid('responsible_user_id')->nullable()->constrained('users')->nullOnDelete();
            
            // Dados da Solicitação
            $table->string('tag_number')->nullable();
            $table->string('requester_name')->nullable();
            $table->text('description');
            $table->date('desired_date')->nullable();
            
            // Classificações (Mantendo os valores em inglês para o backend)
            $table->enum('maintenance_type', ['corrective', 'preventive', 'predictive'])->default('corrective');
            $table->string('priority')->default('normal');
            $table->string('status')->default('pending');
            
            // Dados do Fornecedor/Empresa
            $table->string('vendor_cnpj')->nullable();
            $table->string('vendor_name')->nullable();
            
            // Controle de Tempo
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('service_requests');
    }
};
