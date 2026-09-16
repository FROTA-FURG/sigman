<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Nível opcional abaixo do equipamento (ex.: Motor -> pistão 1/2/3).
     * Cada componente é classificado num dos 3 tipos definidos pelo
     * estagiário -- isso é o que importa pra manutenção, mais do que a
     * árvore de localização em si:
     *
     *   sobressalente_rotativo -> item descartável, troca fácil, baixa durabilidade
     *   sobressalente_consumivel -> óleo, filtro -- o TAG ajuda o técnico a
     *       identificar na hora qual tipo está em uso no equipamento
     *   item_critico -> pode parar o motor ou reduzir a eficiência
     */
    public function up(): void
    {
        Schema::create('component', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('equipment_id')->constrained('equipment')->cascadeOnDelete();

            $table->string('name');
            $table->string('tag_number')->nullable();
            $table->enum('tipo', ['sobressalente_rotativo', 'sobressalente_consumivel', 'item_critico']);
            $table->string('manufacturer')->nullable();
            $table->string('model')->nullable();
            $table->text('description')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('component');
    }
};
