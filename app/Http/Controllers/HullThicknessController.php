<?php

namespace App\Http\Controllers;

use App\Models\HullPlate;
use App\Models\HullRegion;
use App\Models\HullRegionImage;
use App\Models\ThicknessCampaign;
use App\Models\ThicknessReading;
use App\Models\User;
use App\Models\Vessel;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Medição de Espessura de chapas do casco.
 *
 * Leitura: todos (menos terceiro, barrado pelo middleware third_party).
 * Mapeamento (contornos e imagens): gestão em qualquer embarcação;
 * estagiário só na embarcação em que está lotado.
 *
 * Taxa de corrosão, vida residual e status são calculados na tela a partir
 * das leituras -- nada disso é gravado.
 */
class HullThicknessController extends Controller
{
    private const GESTAO = ['dev', 'coordinator', 'engineer'];

    public static function podeMapear(?User $user, Vessel|string $vessel): bool
    {
        $vesselId = $vessel instanceof Vessel ? $vessel->id : $vessel;
        $cargo = $user?->role->name ?? null;

        return in_array($cargo, self::GESTAO, true)
            || ($cargo === 'intern' && $user->vessel_id && $user->vessel_id === $vesselId);
    }

    private function autorizarMapeamento(Request $request, string $vesselId): void
    {
        if (! self::podeMapear($request->user(), $vesselId)) {
            abort(403, 'O mapeamento desta embarcação fica com a gestão e com o estagiário lotado nela.');
        }
    }

    // ------------------------------------------------------------------
    // Página
    // ------------------------------------------------------------------

    public function index(Request $request)
    {
        $vessels = Vessel::whereHas('hullRegions')->orderBy('name')->get();

        return Inertia::render('HullThickness/Index', [
            'embarcacoes' => $vessels->map(fn (Vessel $v) => $this->embarcacao($v, $request->user()))->values(),
            'limites' => ['alerta' => config('hull_thickness.limite_alerta'), 'critico' => config('hull_thickness.limite_critico')],
        ]);
    }

    private function embarcacao(Vessel $vessel, ?User $user): array
    {
        $regioes = $vessel->hullRegions()
            ->with(['currentImage', 'imageUpdater:id,username,nickname', 'images.uploader:id,username,nickname', 'images.positioner:id,username,nickname', 'images.remover:id,username,nickname'])
            ->get();
        $chapas = HullPlate::whereIn('hull_region_id', $regioes->pluck('id'))
            ->with('contourUpdater:id,username,nickname')
            ->get();
        $campanhas = ThicknessCampaign::where('vessel_id', $vessel->id)->orderBy('measured_at')->get();

        // Rótulo da campanha = ano; se houver duas no mesmo ano, a data completa.
        $porAno = $campanhas->countBy(fn ($c) => $c->measured_at->format('Y'));
        $rotulo = fn ($c) => $porAno[$c->measured_at->format('Y')] > 1 ? $c->measured_at->format('Y-m-d') : $c->measured_at->format('Y');

        // Leituras de todas as chapas: campanha -> chapa -> [p1..pn]
        $medicoes = [];
        ThicknessReading::whereIn('thickness_campaign_id', $campanhas->pluck('id'))
            ->orderBy('point_number')
            ->get(['thickness_campaign_id', 'hull_plate_id', 'point_number', 'thickness_mm'])
            ->each(function ($l) use (&$medicoes) {
                $medicoes[$l->hull_plate_id][$l->thickness_campaign_id][$l->point_number - 1] = $l->thickness_mm;
            });

        $codigoDaRegiao = $regioes->pluck('code', 'id');
        $rotuloPorId = $campanhas->mapWithKeys(fn ($c) => [$c->id => $rotulo($c)]);

        return [
            'id' => $vessel->id,
            'tag' => $vessel->tag,
            'nome' => $vessel->name,
            'construcao' => (int) $vessel->year ?: null,
            'podeMapear' => self::podeMapear($user, $vessel),
            'regioes' => $regioes->map(fn ($r) => $this->regiao($r))->values(),
            'campanhas' => $campanhas->map(fn ($c) => ['id' => $rotulo($c), 'uuid' => $c->id, 'data' => $c->measured_at->format('Y-m-d')])->values(),
            'chapas' => $chapas->mapWithKeys(fn (HullPlate $p) => [
                "{$codigoDaRegiao[$p->hull_region_id]}-{$p->number}" => [
                    'id' => $p->id,
                    'ep' => $p->design_thickness_mm,
                    'tipo' => $p->plate_type,
                    'origem' => $p->source_ref,
                    'contorno' => $p->contour,
                    'contornoPor' => $this->nome($p->contourUpdater),
                    'contornoEm' => $p->contour_updated_at?->toIso8601String(),
                    'medicoes' => collect($medicoes[$p->id] ?? [])
                        ->mapWithKeys(fn ($pontos, $campanhaId) => [$rotuloPorId[$campanhaId] => array_map(fn ($i) => $pontos[$i] ?? null, range(0, max(array_keys($pontos))))])
                        ->all(),
                ],
            ]),
        ];
    }

    private function regiao(HullRegion $r): array
    {
        $atual = $r->currentImage;

        return [
            'id' => $r->id,
            'code' => $r->code,
            'nome' => $r->name,
            'chapas' => $r->plate_count,
            'quadro' => $r->frame_width ? ['largura' => $r->frame_width, 'altura' => $r->frame_height] : null,
            'imagem' => $atual ? $this->imagem($atual) : null,
            'atualizadaPor' => $this->nome($r->imageUpdater),
            'atualizadaEm' => $r->image_updated_at?->toIso8601String(),
            'historico' => $r->images->map(fn (HullRegionImage $i) => [
                ...$this->imagem($i),
                'enviadaPor' => $this->nome($i->uploader),
                'enviadaEm' => $i->uploaded_at?->toIso8601String(),
                'posicionadaPor' => $this->nome($i->positioner),
                'posicionadaEm' => $i->positioned_at?->toIso8601String(),
                'substituidaEm' => $i->replaced_at?->toIso8601String(),
                'removidaPor' => $this->nome($i->remover),
                'emUso' => $atual?->id === $i->id,
            ])->values(),
        ];
    }

    private function imagem(HullRegionImage $i): array
    {
        return [
            'id' => $i->id,
            'url' => route('hull-thickness.images.file', $i->id),
            'nome' => $i->original_name,
            'larguraPx' => $i->width_px,
            'alturaPx' => $i->height_px,
            'x' => $i->x,
            'y' => $i->y,
            'largura' => $i->width,
            'altura' => $i->height,
            'escala' => $i->scale,
        ];
    }

    private function nome(?User $u): ?string
    {
        return $u ? ($u->nickname ?: $u->username) : null;
    }

    // ------------------------------------------------------------------
    // Contornos
    // ------------------------------------------------------------------

    /**
     * Grava (ou apaga, com pontos = null) os contornos de várias chapas da
     * região numa chamada só: fechar uma chapa, arrastar um canto, apagar,
     * apagar a região inteira e o Ctrl+Z usam a mesma rota.
     */
    public function updateContours(Request $request, HullRegion $region)
    {
        $this->autorizarMapeamento($request, $region->vessel_id);
        if (! $region->frame_width) {
            throw ValidationException::withMessages(['contornos' => 'Suba a imagem da região antes de desenhar as chapas.']);
        }

        $dados = $request->validate([
            'contornos' => 'required|array|min:1|max:500',
            'contornos.*.numero' => "required|integer|min:1|max:{$region->plate_count}",
            'contornos.*.pontos' => 'present|nullable|array|min:3|max:400',
            'contornos.*.pontos.*' => 'array|size:2',
            'contornos.*.pontos.*.*' => 'numeric',
        ]);

        DB::transaction(function () use ($dados, $region, $request) {
            foreach ($dados['contornos'] as $c) {
                $chapa = HullPlate::firstOrNew(['hull_region_id' => $region->id, 'number' => $c['numero']]);
                if (! $chapa->exists && $c['pontos'] === null) {
                    continue;
                }
                $chapa->fill([
                    'contour' => $c['pontos'] === null ? null : array_map(fn ($p) => [round((float) $p[0], 2), round((float) $p[1], 2)], $c['pontos']),
                    'contour_updated_by' => $request->user()->id,
                    'contour_updated_at' => now(),
                ])->save();
            }
        });

        return back();
    }

    // ------------------------------------------------------------------
    // Imagens
    // ------------------------------------------------------------------

    public function storeImage(Request $request, HullRegion $region)
    {
        $this->autorizarMapeamento($request, $region->vessel_id);
        $request->validate([
            'imagem' => 'required|file|mimes:png,jpg,jpeg,webp|max:'.config('hull_thickness.imagem_max_kb'),
        ]);

        $this->trocarImagem($request, $region, $request->file('imagem'));

        return back()->with('success', "Imagem de {$region->name} atualizada.");
    }

    /** Volta a usar uma imagem do histórico (vira um novo registro, com nova data). */
    public function reuseImage(Request $request, HullRegionImage $image)
    {
        $region = $image->region;
        $this->autorizarMapeamento($request, $region->vessel_id);
        abort_unless(Storage::disk('local')->exists($image->path), 404);

        $this->trocarImagem($request, $region, null, $image);

        return back()->with('success', "Imagem \"{$image->original_name}\" voltou a ser usada.");
    }

    private function trocarImagem(Request $request, HullRegion $region, ?UploadedFile $arquivo, ?HullRegionImage $origem = null): void
    {
        $disk = Storage::disk('local');
        $pasta = "hull/{$region->vessel->tag}/{$region->code}";

        if ($arquivo) {
            [$wpx, $hpx] = getimagesize($arquivo->getRealPath()) ?: [0, 0];
            if (! $wpx || ! $hpx) {
                throw ValidationException::withMessages(['imagem' => 'Não foi possível ler as dimensões da imagem.']);
            }
            $path = $arquivo->store($pasta, 'local');
            $nome = $arquivo->getClientOriginalName();
            $tamanho = $arquivo->getSize();
        } else {
            $extensao = pathinfo($origem->path, PATHINFO_EXTENSION);
            $path = "{$pasta}/".\Illuminate\Support\Str::uuid().".{$extensao}";
            $disk->copy($origem->path, $path);
            [$wpx, $hpx, $nome, $tamanho] = [$origem->width_px, $origem->height_px, $origem->original_name, $origem->size];
        }

        DB::transaction(function () use ($request, $region, $path, $nome, $tamanho, $wpx, $hpx) {
            // 1ª imagem define o quadro de coordenadas da região.
            if (! $region->frame_width) {
                $largura = (float) config('hull_thickness.largura_do_quadro');
                $region->frame_width = $largura;
                $region->frame_height = round($largura * $hpx / $wpx, 2);
            }
            // Centraliza a imagem inteira no quadro (as chapas já desenhadas não se movem).
            $fit = min($region->frame_width / $wpx, $region->frame_height / $hpx);
            [$w, $h] = [$wpx * $fit, $hpx * $fit];

            $this->aposentarAtual($region);
            $nova = $region->images()->create([
                'path' => $path,
                'original_name' => $nome,
                'size' => $tamanho,
                'width_px' => $wpx,
                'height_px' => $hpx,
                'x' => ($region->frame_width - $w) / 2,
                'y' => ($region->frame_height - $h) / 2,
                'width' => $w,
                'height' => $h,
                'scale' => 1,
                'uploaded_by' => $request->user()->id,
                'uploaded_at' => now(),
            ]);
            $region->fill(['current_image_id' => $nova->id, 'image_updated_by' => $request->user()->id, 'image_updated_at' => now()])->save();
        });
    }

    private function aposentarAtual(HullRegion $region, ?string $removidaPor = null): void
    {
        if ($region->current_image_id) {
            HullRegionImage::whereKey($region->current_image_id)->update(['replaced_at' => now(), 'removed_by' => $removidaPor]);
        }
    }

    public function positionImage(Request $request, HullRegionImage $image)
    {
        $region = $image->region;
        $this->autorizarMapeamento($request, $region->vessel_id);
        if ($region->current_image_id !== $image->id) {
            throw ValidationException::withMessages(['imagem' => 'Só a imagem em uso pode ser reposicionada.']);
        }

        $dados = $request->validate([
            'x' => 'required|numeric',
            'y' => 'required|numeric',
            'largura' => 'required|numeric|gt:0',
            'altura' => 'required|numeric|gt:0',
            'escala' => 'required|numeric|between:0.05,20',
        ]);

        $image->update([
            'x' => $dados['x'], 'y' => $dados['y'], 'width' => $dados['largura'], 'height' => $dados['altura'], 'scale' => $dados['escala'],
            'positioned_by' => $request->user()->id, 'positioned_at' => now(),
        ]);
        $region->update(['image_updated_by' => $request->user()->id, 'image_updated_at' => now()]);

        return back();
    }

    /** Tira a imagem de uso (fica no histórico). O quadro e os contornos continuam. */
    public function removeImage(Request $request, HullRegion $region)
    {
        $this->autorizarMapeamento($request, $region->vessel_id);
        if (! $region->current_image_id) {
            throw ValidationException::withMessages(['imagem' => 'A região não tem imagem em uso.']);
        }

        DB::transaction(function () use ($request, $region) {
            $this->aposentarAtual($region, $request->user()->id);
            $region->update(['current_image_id' => null, 'image_updated_by' => $request->user()->id, 'image_updated_at' => now()]);
        });

        return back()->with('success', "Imagem de {$region->name} removida.");
    }

    public function imageFile(HullRegionImage $image)
    {
        abort_unless(Storage::disk('local')->exists($image->path), 404);

        return Storage::disk('local')->response($image->path, $image->original_name, [
            'Cache-Control' => 'private, max-age=31536000, immutable', // o arquivo de um registro nunca muda
        ]);
    }
}
