<?php

use App\Models\CruiseLeg;
use App\Models\Role;
use App\Models\User;
use App\Models\Vessel;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->vessel = Vessel::create(['name' => 'Atlântico Sul', 'tag' => 'AS']);
    $this->engenheiro = User::factory()->create(); // factory cria como engineer
    $this->etapa = CruiseLeg::create([
        'vessel_id' => $this->vessel->id,
        'leg_number' => 1,
        'area' => 'Oceânico Sul',
        'starts_at' => '2026-09-21',
        'ends_at' => '2026-10-03',
        'embark_port' => 'RG',
        'disembark_port' => 'RG',
    ]);
});

$etapa2 = [
    'leg_number' => 2,
    'area' => '  Oceânico Sul ',
    'starts_at' => '2026-10-07',
    'ends_at' => '2026-10-18',
    'embark_port' => 'RG',
    'disembark_port' => 'Itajaí',
];

it('mostra as etapas na tela da embarcação', function () {
    $this->actingAs($this->engenheiro)
        ->get(route('vessels.show', $this->vessel->id))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Vessels/VesselDetails')
            ->has('cruiseLegs', 1)
            ->where('cruiseLegs.0.legNumber', 1)
            ->where('cruiseLegs.0.startsAt', '2026-09-21')
            ->where('cruiseLegs.0.endsAt', '2026-10-03')
            ->where('canEditCruisePlan', true));
});

it('cria, edita e exclui uma etapa', function () use ($etapa2) {
    $this->actingAs($this->engenheiro)
        ->post(route('cruise-legs.store', $this->vessel->id), $etapa2)
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $nova = CruiseLeg::where('leg_number', 2)->first();
    expect($nova->area)->toBe('Oceânico Sul')
        ->and($nova->disembark_port)->toBe('Itajaí')
        ->and($nova->created_by)->toBe($this->engenheiro->id);

    $this->actingAs($this->engenheiro)
        ->put(route('cruise-legs.update', $nova->id), [...$etapa2, 'ends_at' => '2026-10-20', 'notes' => 'Troca de equipe'])
        ->assertSessionHasNoErrors();
    expect($nova->fresh()->ends_at->format('Y-m-d'))->toBe('2026-10-20')
        ->and($nova->fresh()->notes)->toBe('Troca de equipe');

    $this->actingAs($this->engenheiro)->delete(route('cruise-legs.destroy', $nova->id))->assertRedirect();
    expect(CruiseLeg::count())->toBe(1);
});

it('recusa etapa sobreposta, fim antes do início e número repetido no ano', function () use ($etapa2) {
    $this->actingAs($this->engenheiro)
        ->post(route('cruise-legs.store', $this->vessel->id), [...$etapa2, 'starts_at' => '2026-10-01'])
        ->assertSessionHasErrors('starts_at');

    $this->actingAs($this->engenheiro)
        ->post(route('cruise-legs.store', $this->vessel->id), [...$etapa2, 'ends_at' => '2026-10-01'])
        ->assertSessionHasErrors('ends_at');

    $this->actingAs($this->engenheiro)
        ->post(route('cruise-legs.store', $this->vessel->id), [...$etapa2, 'leg_number' => 1])
        ->assertSessionHasErrors('leg_number');

    // Encostar (desembarca e embarca no mesmo dia) é permitido.
    $this->actingAs($this->engenheiro)
        ->post(route('cruise-legs.store', $this->vessel->id), [...$etapa2, 'starts_at' => '2026-10-03'])
        ->assertSessionHasNoErrors();

    // Editar a própria etapa não conflita com ela mesma.
    $this->actingAs($this->engenheiro)
        ->put(route('cruise-legs.update', $this->etapa->id), [
            'leg_number' => 1, 'area' => 'Oceânico Sul', 'starts_at' => '2026-09-20', 'ends_at' => '2026-10-02',
            'embark_port' => 'RG', 'disembark_port' => 'RG',
        ])
        ->assertSessionHasNoErrors();
});

it('só a gestão edita; os demais apenas veem', function () use ($etapa2) {
    $estagiario = User::factory()->create(['role_id' => Role::firstOrCreate(['name' => 'intern'])->id]);

    $this->actingAs($estagiario)
        ->get(route('vessels.show', $this->vessel->id))
        ->assertInertia(fn (Assert $page) => $page->has('cruiseLegs', 1)->where('canEditCruisePlan', false));

    $this->actingAs($estagiario)->post(route('cruise-legs.store', $this->vessel->id), $etapa2)->assertForbidden();
    $this->actingAs($estagiario)->delete(route('cruise-legs.destroy', $this->etapa->id))->assertForbidden();
    expect(CruiseLeg::count())->toBe(1);
});

it('alimenta o calendário de OS com as etapas do banco', function () {
    expect(CruiseLeg::periodosPorEmbarcacao())->toBe([
        'AS' => [['inicio' => '2026-09-21', 'fim' => '2026-10-03', 'descricao' => 'Etapa 01 · Oceânico Sul']],
    ]);
});

it('cruza o plano de cruzeiro com o calendário de OS e o do equipamento', function () {
    $outra = Vessel::create(['name' => 'Lancha Larus', 'tag' => 'LL']);
    $equipamento = \App\Models\Equipment::create([
        'vessel_id' => $this->vessel->id,
        'tag_number' => 'AS01-SMP-MCA04',
        'name' => 'Motor auxiliar',
    ]);
    $periodo = [['inicio' => '2026-09-21', 'fim' => '2026-10-03', 'descricao' => 'Etapa 01 · Oceânico Sul']];

    $this->actingAs($this->engenheiro)
        ->get(route('work-orders.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('cruisePlans.AS', $periodo)
            ->missing('cruisePlans.LL'));

    $this->actingAs($this->engenheiro)
        ->get(route('equipments.show', $equipamento->id))
        ->assertInertia(fn (Assert $page) => $page->where('cruisePeriods', $periodo));
});

it('registra quem criou e quem atualizou a etapa', function () {
    $outro = User::factory()->create(['nickname' => 'Letícia']);

    $this->actingAs($outro)
        ->put(route('cruise-legs.update', $this->etapa->id), [
            'leg_number' => 1, 'area' => 'Oceânico Sul', 'starts_at' => '2026-09-21', 'ends_at' => '2026-10-04',
            'embark_port' => 'RG', 'disembark_port' => 'RG',
        ])
        ->assertSessionHasNoErrors();

    expect($this->etapa->fresh()->updated_by)->toBe($outro->id);

    $this->actingAs($this->engenheiro)
        ->get(route('vessels.show', $this->vessel->id))
        ->assertInertia(fn (Assert $page) => $page->where('cruiseLegs.0.updatedBy', 'Letícia'));
});
