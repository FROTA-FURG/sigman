<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vessels', function (Blueprint $table) {
            $table->uuid('id')->primary(); // Chave primária como UUID
            
            // Campos originais
            $table->string('code')->nullable();
            $table->string('name');
            $table->string('class')->nullable();
            $table->string('location')->nullable();

            // Novos campos do seu mockup
            $table->string('tag')->nullable();
            $table->string('type')->nullable();
            $table->string('status')->default('Operacional');
            $table->integer('health_score')->default(100);
            $table->integer('active_wos')->default(0);
            $table->integer('pending_srs')->default(0);
            $table->date('last_inspection')->nullable();
            $table->string('model_path')->nullable();
            $table->json('dimensions')->nullable(); 
            $table->string('builder')->nullable();
            $table->string('year')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vessels');
    }
};