<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Etapa do plano de cruzeiro de uma embarcação (período em que ela está
 * fora, indisponível pra manutenção).
 */
class CruiseLeg extends Model
{
    use HasUuids;

    protected $fillable = [
        'vessel_id',
        'leg_number',
        'area',
        'starts_at',
        'ends_at',
        'embark_port',
        'disembark_port',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'leg_number' => 'integer',
        'starts_at' => 'date',
        'ends_at' => 'date',
    ];

    public function vessel()
    {
        return $this->belongsTo(Vessel::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /** "Etapa 01 · Oceânico Sul" -- rótulo usado nos calendários. */
    public function rotulo(): string
    {
        return sprintf('Etapa %02d · %s', $this->leg_number, $this->area);
    }

    /**
     * Formato que os calendários de OS consomem ({inicio, fim, descricao}),
     * por tag da embarcação. Uma consulta só pra frota toda.
     *
     * @return array<string, array<int, array{inicio:string, fim:string, descricao:string}>>
     */
    public static function periodosPorEmbarcacao(?string $vesselId = null): array
    {
        return static::query()
            ->with('vessel:id,tag')
            ->when($vesselId, fn ($q) => $q->where('vessel_id', $vesselId))
            ->orderBy('starts_at')
            ->get()
            ->groupBy(fn (self $etapa) => $etapa->vessel->tag)
            ->map(fn ($etapas) => $etapas->map(fn (self $etapa) => [
                'inicio' => $etapa->starts_at->format('Y-m-d'),
                'fim' => $etapa->ends_at->format('Y-m-d'),
                'descricao' => $etapa->rotulo(),
            ])->values()->all())
            ->all();
    }
}
