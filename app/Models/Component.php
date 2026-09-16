<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

/**
 * Nível opcional abaixo do equipamento (ex.: Motor -> pistão 1/2/3) --
 * ver ComponentController e a migration create_component_table pro
 * significado dos 3 tipos.
 */
class Component extends Model
{
    use HasUuids;

    protected $table = 'component';

    protected $fillable = [
        'equipment_id',
        'name',
        'tag_number',
        'tipo',
        'manufacturer',
        'model',
        'description',
    ];

    public function equipment()
    {
        return $this->belongsTo(Equipment::class);
    }
}
