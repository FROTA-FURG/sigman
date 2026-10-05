<?php

use App\Models\Equipment;
use App\Models\OilActionPlanItem;
use App\Models\OilAnalysisReport;
use App\Models\OilSample;
use App\Models\OilSamplingPoint;
use App\Models\Role;
use App\Models\User;
use App\Models\Vessel;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Storage::fake('local');

    $this->vessel = Vessel::create(['name' => 'Atlântico Sul', 'tag' => 'AS']);
    $this->equipment = Equipment::create([
        'vessel_id' => $this->vessel->id,
        'tag_number' => 'AS01-SMP-MCA04',
        'name' => 'Motor auxiliar de Emergência',
    ]);
    $this->point = OilSamplingPoint::create([
        'vessel_id' => $this->vessel->id,
        'equipment_id' => $this->equipment->id,
        'sheet_key' => 'AS01-SMP-MCA04',
        'sheet_tag' => 'AS01-SMP-MCA04',
        'name' => 'Motor De Combustão Auxiliar',
        'family' => 'motor',
        'limits' => ['amarelo' => ['fe' => 100], 'vermelho' => ['fe' => 151]],
    ]);
    $this->sample = OilSample::create([
        'oil_sampling_point_id' => $this->point->id,
        'sample_number' => 3,
        'collected_at' => '2026-02-17',
        'results' => ['fe' => 20, 'cu' => 3],
        'condition' => 'normal',
        'source' => 'planilha',
    ]);

    $this->user = User::factory()->create();
});

it('carrega a página da embarcação com pontos, amostras e plano', function () {
    OilActionPlanItem::create([
        'vessel_id' => $this->vessel->id,
        'oil_sampling_point_id' => $this->point->id,
        'equipment_name' => 'Motor auxiliar',
        'action' => 'Coletar nova amostra',
        'status' => 'vigente',
        'source' => 'planilha',
    ]);

    $this->actingAs($this->user)
        ->get(route('oil-analysis.show', 'AS'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('OilAnalysis/Vessel')
            ->has('pontos', 1)
            ->where('pontos.0.equipmentId', $this->equipment->id)
            ->where('pontos.0.amostras.0.dataColeta', '2026-02-17')
            ->where('pontos.0.amostras.0.condicao', 'Normal')
            ->has('plano', 1)
            ->has('historico', 0)
            ->has('familias.motor.grupos'));
});

it('registra uma análise com o PDF do laudo e numera no servidor', function () {
    $this->actingAs($this->user)
        ->post(route('oil-analysis.samples.store', $this->point->id), [
            'dataColeta' => '2026-09-30',
            'laboratorio' => 'Laboroil',
            'produtoTrocado' => 'Não',
            'resultados' => ['fe' => '160', 'cu' => '4,5', 'naoExiste' => '9'],
            'condicao' => 'Intervir',
            'parecerLaboratorio' => 'O produto encontra-se em condições de uso.',
            'acaoEquipe' => 'Trocar filtro e antecipar coleta.',
            'laudo' => UploadedFile::fake()->create('laudo.pdf', 120, 'application/pdf'),
        ])
        ->assertSessionHasErrors('resultados.cu'); // vírgula não é número válido no servidor

    $this->actingAs($this->user)
        ->post(route('oil-analysis.samples.store', $this->point->id), [
            'dataColeta' => '2026-09-30',
            'laboratorio' => 'Laboroil',
            'produtoTrocado' => 'Não',
            'resultados' => ['fe' => '160', 'cu' => '4.5', 'naoExiste' => '9'],
            'condicao' => 'Intervir',
            'parecerLaboratorio' => 'O produto encontra-se em condições de uso.',
            'acaoEquipe' => 'Trocar filtro e antecipar coleta.',
            'laudo' => UploadedFile::fake()->create('laudo.pdf', 120, 'application/pdf'),
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $nova = OilSample::where('oil_sampling_point_id', $this->point->id)->latest('sample_number')->first();

    expect($nova->sample_number)->toBe(4)
        ->and($nova->source)->toBe('pdf')
        ->and($nova->condition)->toBe('intervir')
        ->and($nova->oil_changed)->toBeFalse()
        ->and($nova->results)->toEqual(['fe' => 160, 'cu' => 4.5])
        ->and($nova->team_action)->toBe('Trocar filtro e antecipar coleta.')
        ->and($nova->created_by)->toBe($this->user->id);
    Storage::disk('local')->assertExists($nova->report_path);

    $this->actingAs($this->user)
        ->get(route('oil-analysis.samples.report', $nova->id))
        ->assertOk();
});

it('recusa análise sem nenhum resultado e laudo que não é PDF', function () {
    $this->actingAs($this->user)
        ->post(route('oil-analysis.samples.store', $this->point->id), [
            'dataColeta' => '2026-09-30',
            'resultados' => ['fe' => null],
        ])
        ->assertSessionHasErrors('resultados');

    $this->actingAs($this->user)
        ->post(route('oil-analysis.samples.store', $this->point->id), [
            'dataColeta' => '2026-09-30',
            'resultados' => ['fe' => '10'],
            'laudo' => UploadedFile::fake()->create('laudo.docx', 10, 'application/msword'),
        ])
        ->assertSessionHasErrors('laudo');

    expect(OilSample::count())->toBe(1);
});

it('salva parecer do laboratório e ação da equipe', function () {
    $this->actingAs($this->user)
        ->patch(route('oil-analysis.samples.notes', $this->sample->id), [
            'parecerLaboratorio' => '  Desempenho satisfatório.  ',
            'acaoEquipe' => '',
        ])
        ->assertRedirect();

    $this->sample->refresh();
    expect($this->sample->lab_opinion)->toBe('Desempenho satisfatório.')
        ->and($this->sample->team_action)->toBeNull();
});

it('gera plano de ação da amostra e arquiva o item vigente', function () {
    $antigo = OilActionPlanItem::create([
        'vessel_id' => $this->vessel->id,
        'oil_sampling_point_id' => $this->point->id,
        'equipment_name' => 'Motor auxiliar (planilha)',
        'sheet_tag' => 'AS01-SMP-MCA04',
        'responsible' => 'Alexandre',
        'status' => 'vigente',
        'source' => 'planilha',
    ]);

    $this->actingAs($this->user)
        ->post(route('oil-analysis.action-plan.store', $this->point->id), [
            'amostraId' => $this->sample->id,
            'frequenciaMeses' => 6,
            'acao' => 'Trocar a carga de óleo.',
            'responsaveis' => 'Letícia',
            'prazo' => '2026-10-31',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $antigo->refresh();
    $novo = OilActionPlanItem::where('status', 'vigente')->first();

    expect($antigo->status)->toBe('arquivado')
        ->and($antigo->archived_at)->not->toBeNull()
        ->and($novo->oil_sample_id)->toBe($this->sample->id)
        ->and($novo->equipment_name)->toBe('Motor auxiliar (planilha)')
        ->and($novo->collected_at->format('Y-m-d'))->toBe('2026-02-17')
        ->and($novo->next_collection_at->format('Y-m-d'))->toBe('2026-08-17')
        ->and($novo->condition)->toBe('normal')
        ->and($novo->source)->toBe('amostra');
});

it('não aceita amostra de outro ponto ao gerar o plano', function () {
    $outro = OilSamplingPoint::create([
        'vessel_id' => $this->vessel->id,
        'sheet_key' => 'OUTRO',
        'sheet_tag' => 'OUTRO',
        'name' => 'Outro',
        'family' => 'redutora',
    ]);

    $this->actingAs($this->user)
        ->post(route('oil-analysis.action-plan.store', $outro->id), [
            'amostraId' => $this->sample->id,
            'acao' => 'x',
        ])
        ->assertSessionHasErrors('amostraId');
});

it('guarda os laudos submetidos em lote', function () {
    $this->actingAs($this->user)
        ->post(route('oil-analysis.reports.store', 'AS'), [
            'laudos' => [
                UploadedFile::fake()->create('a.pdf', 50, 'application/pdf'),
                UploadedFile::fake()->create('b.pdf', 50, 'application/pdf'),
            ],
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $laudos = OilAnalysisReport::all();
    expect($laudos)->toHaveCount(2)
        ->and($laudos->pluck('status')->unique()->all())->toBe(['aguardando_leitura']);
    Storage::disk('local')->assertExists($laudos->first()->path);

    $this->actingAs($this->user)->get(route('oil-analysis.reports.download', $laudos->first()->id))->assertOk();
});

it('bloqueia o perfil terceiro', function () {
    $terceiro = User::factory()->create(['role_id' => Role::firstOrCreate(['name' => 'terceiro'])->id]);

    $this->actingAs($terceiro)->get(route('oil-analysis.show', 'AS'))->assertForbidden();
    $this->actingAs($terceiro)
        ->patch(route('oil-analysis.samples.notes', $this->sample->id), ['acaoEquipe' => 'x'])
        ->assertForbidden();
});

it('importa a planilha sem duplicar ao rodar de novo', function () {
    Vessel::create(['name' => 'Ciências do Mar 1', 'tag' => 'CM1']);
    Vessel::create(['name' => 'Lancha Larus', 'tag' => 'LL']);

    $this->artisan('oil-analysis:import')->assertSuccessful();
    $pontos = OilSamplingPoint::count();
    $amostras = OilSample::count();
    $itens = OilActionPlanItem::count();

    expect($pontos)->toBeGreaterThan(20)->and($amostras)->toBeGreaterThan(200)->and($itens)->toBeGreaterThan(50);

    // O ponto do MCA04 já existia (criado no beforeEach) e mantém o vínculo.
    expect(OilSamplingPoint::where('sheet_key', 'AS01-SMP-MCA04')->value('equipment_id'))->toBe($this->equipment->id);

    $this->artisan('oil-analysis:import')->assertSuccessful();
    expect(OilSamplingPoint::count())->toBe($pontos)
        ->and(OilSample::count())->toBe($amostras)
        ->and(OilActionPlanItem::count())->toBe($itens);
});
