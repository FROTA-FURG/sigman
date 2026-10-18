<?php

use App\Models\HullPlate;
use App\Models\HullRegion;
use App\Models\HullRegionImage;
use App\Models\Role;
use App\Models\ThicknessCampaign;
use App\Models\ThicknessReading;
use App\Models\User;
use App\Models\Vessel;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Storage::fake('local');

    $this->vessel = Vessel::create(['name' => 'Atlântico Sul', 'tag' => 'AS', 'year' => 1973]);
    $this->outra = Vessel::create(['name' => 'Ciências do Mar 1', 'tag' => 'CM1', 'year' => 2017]);
    $this->regiao = HullRegion::create(['vessel_id' => $this->vessel->id, 'code' => 'BE', 'name' => 'Boreste', 'plate_count' => 35]);
    $this->chapa = HullPlate::create(['hull_region_id' => $this->regiao->id, 'number' => 34, 'design_thickness_mm' => 7.94, 'plate_type' => 'Costado']);
    $campanha = ThicknessCampaign::create(['vessel_id' => $this->vessel->id, 'measured_at' => '2018-07-01', 'source' => 'planilha']);
    foreach ([7.3, 8.1, 8.4] as $i => $v) {
        ThicknessReading::create(['thickness_campaign_id' => $campanha->id, 'hull_plate_id' => $this->chapa->id, 'point_number' => $i + 1, 'thickness_mm' => $v]);
    }

    $this->engenheiro = User::factory()->create(); // factory cria como engineer
    $intern = Role::firstOrCreate(['name' => 'intern'])->id;
    $this->estagiarioAS = User::factory()->create(['role_id' => $intern, 'vessel_id' => $this->vessel->id]);
    $this->estagiarioCM1 = User::factory()->create(['role_id' => $intern, 'vessel_id' => $this->outra->id]);
});

$contorno = [[10, 10], [100, 10], [100, 60], [10, 60]];

it('carrega a página com regiões, chapas e leituras', function () {
    $this->actingAs($this->estagiarioCM1)
        ->get(route('hull-thickness.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('HullThickness/Index')
            ->has('embarcacoes', 1)
            ->where('embarcacoes.0.tag', 'AS')
            ->where('embarcacoes.0.construcao', 1973)
            ->where('embarcacoes.0.podeMapear', false) // estagiário de outra embarcação
            ->where('embarcacoes.0.regioes.0.code', 'BE')
            ->where('embarcacoes.0.regioes.0.quadro', null)
            ->where('embarcacoes.0.chapas.BE-34.ep', 7.94)
            ->where('embarcacoes.0.chapas.BE-34.medicoes.2018', [7.3, 8.1, 8.4]));
});

it('sobe a 1ª imagem, que define o quadro, e registra quem atualizou', function () {
    $this->actingAs($this->estagiarioAS)
        ->post(route('hull-thickness.images.store', $this->regiao->id), ['imagem' => UploadedFile::fake()->image('boreste.png', 2000, 600)])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $regiao = $this->regiao->fresh();
    $imagem = $regiao->currentImage;
    expect($regiao->frame_width)->toBe(1000.0)
        ->and($regiao->frame_height)->toBe(300.0)
        ->and($regiao->image_updated_by)->toBe($this->estagiarioAS->id)
        ->and($imagem->original_name)->toBe('boreste.png')
        ->and([$imagem->x, $imagem->y, $imagem->width, $imagem->height])->toBe([0.0, 0.0, 1000.0, 300.0])
        ->and($imagem->uploaded_by)->toBe($this->estagiarioAS->id);
    Storage::disk('local')->assertExists($imagem->path);

    $this->actingAs($this->engenheiro)->get(route('hull-thickness.images.file', $imagem->id))->assertOk();
});

it('desenha contornos e preserva-os ao trocar a imagem', function () use ($contorno) {
    $this->actingAs($this->estagiarioAS)
        ->put(route('hull-thickness.contours.update', $this->regiao->id), ['contornos' => [['numero' => 34, 'pontos' => $contorno]]])
        ->assertSessionHasErrors('contornos'); // sem imagem ainda

    $this->actingAs($this->estagiarioAS)->post(route('hull-thickness.images.store', $this->regiao->id), ['imagem' => UploadedFile::fake()->image('v1.png', 1000, 300)]);
    $this->actingAs($this->estagiarioAS)
        ->put(route('hull-thickness.contours.update', $this->regiao->id), ['contornos' => [['numero' => 34, 'pontos' => $contorno], ['numero' => 2, 'pontos' => $contorno]]])
        ->assertSessionHasNoErrors();

    expect($this->chapa->fresh()->contour)->toEqual($contorno)
        ->and($this->chapa->fresh()->contour_updated_by)->toBe($this->estagiarioAS->id)
        ->and(HullPlate::where('number', 2)->first()->design_thickness_mm)->toBeNull(); // criada pelo desenho, sem planilha

    $primeira = $this->regiao->fresh()->current_image_id;
    $this->actingAs($this->engenheiro)->post(route('hull-thickness.images.store', $this->regiao->id), ['imagem' => UploadedFile::fake()->image('v2.png', 3000, 900)]);

    expect($this->chapa->fresh()->contour)->toEqual($contorno)
        ->and(HullRegionImage::find($primeira)->replaced_at)->not->toBeNull()
        ->and($this->regiao->fresh()->current_image_id)->not->toBe($primeira)
        ->and($this->regiao->fresh()->image_updated_by)->toBe($this->engenheiro->id);

    // Apagar (pontos = null)
    $this->actingAs($this->engenheiro)
        ->put(route('hull-thickness.contours.update', $this->regiao->id), ['contornos' => [['numero' => 34, 'pontos' => null]]])
        ->assertSessionHasNoErrors();
    expect($this->chapa->fresh()->contour)->toBeNull();
});

it('ajusta a posição, tira de uso e volta a usar uma imagem', function () {
    $this->actingAs($this->engenheiro)->post(route('hull-thickness.images.store', $this->regiao->id), ['imagem' => UploadedFile::fake()->image('v1.png', 1000, 300)]);
    $imagem = $this->regiao->fresh()->currentImage;

    $this->actingAs($this->estagiarioAS)
        ->patch(route('hull-thickness.images.position', $imagem->id), ['x' => 5, 'y' => -3, 'largura' => 1100, 'altura' => 330, 'escala' => 1.1])
        ->assertSessionHasNoErrors();
    $imagem->refresh();
    expect($imagem->x)->toBe(5.0)->and($imagem->positioned_by)->toBe($this->estagiarioAS->id);

    $this->actingAs($this->estagiarioAS)->delete(route('hull-thickness.images.remove', $this->regiao->id))->assertSessionHasNoErrors();
    expect($this->regiao->fresh()->current_image_id)->toBeNull()
        ->and($imagem->fresh()->removed_by)->toBe($this->estagiarioAS->id)
        ->and($this->regiao->fresh()->frame_width)->toBe(1000.0); // o quadro fica

    $this->actingAs($this->engenheiro)->post(route('hull-thickness.images.reuse', $imagem->id))->assertSessionHasNoErrors();
    $nova = $this->regiao->fresh()->currentImage;
    expect($nova->id)->not->toBe($imagem->id)
        ->and($nova->original_name)->toBe('v1.png')
        ->and(HullRegionImage::count())->toBe(2);
    Storage::disk('local')->assertExists($nova->path);
});

it('bloqueia o mapeamento de quem não pode', function () use ($contorno) {
    $this->actingAs($this->estagiarioCM1)
        ->post(route('hull-thickness.images.store', $this->regiao->id), ['imagem' => UploadedFile::fake()->image('x.png', 100, 30)])
        ->assertForbidden();
    $this->actingAs($this->estagiarioCM1)
        ->put(route('hull-thickness.contours.update', $this->regiao->id), ['contornos' => [['numero' => 34, 'pontos' => $contorno]]])
        ->assertForbidden();

    $terceiro = User::factory()->create(['role_id' => Role::firstOrCreate(['name' => 'terceiro'])->id]);
    $this->actingAs($terceiro)->get(route('hull-thickness.index'))->assertForbidden();
});

it('importa a planilha sem duplicar e sem mexer nos contornos', function () use ($contorno) {
    $this->vessel->update(['year' => 2010]);
    $this->artisan('hull-thickness:import')->assertSuccessful();

    expect((int) $this->vessel->fresh()->year)->toBe(1973)
        ->and(HullRegion::where('vessel_id', $this->vessel->id)->count())->toBe(7)
        ->and(HullPlate::count())->toBe(206)
        ->and(ThicknessCampaign::count())->toBe(4);
    $leituras = ThicknessReading::count();

    $this->chapa->update(['contour' => $contorno]);
    $this->artisan('hull-thickness:import')->assertSuccessful();

    expect(HullPlate::count())->toBe(206)
        ->and(ThicknessReading::count())->toBe($leituras)
        ->and($this->chapa->fresh()->contour)->toEqual($contorno);
});
