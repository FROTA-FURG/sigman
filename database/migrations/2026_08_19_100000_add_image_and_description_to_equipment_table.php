<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `image_url` nasceu como `binary` (BLOB) na migration original e nunca
     * foi lida/gravada em lugar nenhum do código -- coluna morta. O padrão
     * do Laravel é guardar o arquivo em disco e só o *caminho* no banco, daí
     * a troca para `string`. Como não há leitura/escrita hoje, não existe
     * dado pra migrar: dropar e recriar é seguro.
     */
    public function up(): void
    {
        Schema::table('equipment', function (Blueprint $table) {
            $table->dropColumn('image_url');
        });

        Schema::table('equipment', function (Blueprint $table) {
            $table->string('image_url')->nullable()->after('model');
            $table->text('description')->nullable()->after('image_url');
        });
    }

    public function down(): void
    {
        Schema::table('equipment', function (Blueprint $table) {
            $table->dropColumn(['image_url', 'description']);
        });

        Schema::table('equipment', function (Blueprint $table) {
            $table->binary('image_url')->nullable();
        });
    }
};
