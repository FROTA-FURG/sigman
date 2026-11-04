<?php

use App\Models\Equipment;
use App\Models\Role;
use App\Models\User;
use App\Models\Vessel;
use App\Models\WorkOrder;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;

/*
 * Regras de OS: descartar (excluir), ajustar OS antiga, permissões do
 * estagiário e os 3 modos de inativar/reprogramar -- inclusive refeitos em
 * cadeia (reprogramar a OS que já nasceu de uma reprogramação).
 */

beforeEach(function () {
    Notification::fake();
    Mail::fake();

    $this->as = Vessel::create(['name' => 'Atlântico Sul', 'tag' => 'AS']);
    $this->cm1 = Vessel::create(['name' => 'Ciências do Mar 1', 'tag' => 'CM1']);
    $this->eqAS = Equipment::create(['vessel_id' => $this->as->id, 'tag_number' => 'AS01-SPP-MCP01', 'name' => 'Motor principal']);
    $this->eqCM1 = Equipment::create(['vessel_id' => $this->cm1->id, 'tag_number' => 'CM01-SPP-MCPBB/BE', 'name' => 'Motor principal']);

    $papel = fn ($nome) => Role::firstOrCreate(['name' => $nome])->id;
    $this->engenheiro = User::factory()->create();
    $this->coordenador = User::factory()->create(['role_id' => $papel('coordinator')]);
    $this->estagiarioAS = User::factory()->create(['role_id' => $papel('intern'), 'vessel_id' => $this->as->id]);
    $this->marinheiro = User::factory()->create(['role_id' => $papel('seaman'), 'vessel_id' => $this->as->id]);
    $this->tecnico = User::factory()->create(['role_id' => $papel('technician')]);

    $this->novaOs = fn (array $extra = []) => WorkOrder::create([
        'os_number' => 'AS' . str_pad((string) (WorkOrder::count() + 1), 4, '0', STR_PAD_LEFT),
        'equipment_id' => $this->eqAS->id,
        'description' => 'Troca de óleo do MCP',
        'maintenance_type' => 'preventive',
        'priority' => 'medium',
        'status' => 'open',
        'periodicity' => 'monthly',
        'in_52_week_plan' => true,
        'created_at' => '2026-03-10',
        ...$extra,
    ]);
});

function payloadEdicao(WorkOrder $os, array $extra = []): array
{
    return [
        'equipment_id' => $os->equipment_id,
        'description' => $os->description,
        'maintenance_type' => $os->maintenance_type,
        'priority' => $os->priority,
        'created_at' => $os->created_at->format('Y-m-d'),
        ...$extra,
    ];
}

// --- Ajustar OS antiga --------------------------------------------------------

it('ajusta OS antiga (datas e status de 2025)', function () {
    $os = ($this->novaOs)(['created_at' => '2025-05-10', 'periodicity' => null, 'in_52_week_plan' => false]);

    $this->actingAs($this->engenheiro)
        ->put(route('work-orders.update', $os->id), payloadEdicao($os, [
            'created_at' => '2025-05-12', 'status' => 'completed', 'started_at' => '2025-05-12 08:00', 'completed_at' => '2025-05-13 17:00',
        ]))
        ->assertSessionHasNoErrors();

    $os->refresh();
    expect($os->created_at->format('Y-m-d'))->toBe('2025-05-12')
        ->and($os->status)->toBe('completed')
        ->and($os->completed_at->format('Y-m-d H:i'))->toBe('2025-05-13 17:00') // vale a data informada, não "agora"
        ->and($os->started_at->format('Y-m-d H:i'))->toBe('2025-05-12 08:00')
        ->and(WorkOrder::count())->toBe(1); // avulsa (sem periodicidade): não gera próxima
});

// --- Estagiário ---------------------------------------------------------------

it('estagiário: status só na OS da própria embarcação; não inativa; avalia', function () {
    $osAS = ($this->novaOs)();
    $osCM1 = ($this->novaOs)(['equipment_id' => $this->eqCM1->id, 'os_number' => 'CM10001']);

    $this->actingAs($this->estagiarioAS)->put(route('work-orders.update-status', $osAS->id), ['status' => 'in_progress'])->assertRedirect();
    expect($osAS->fresh()->status)->toBe('in_progress');

    $this->actingAs($this->estagiarioAS)->put(route('work-orders.update-status', $osCM1->id), ['status' => 'in_progress'])->assertForbidden();

    $this->actingAs($this->estagiarioAS)
        ->post(route('work-orders.inactivate', $osAS->id), ['modo' => 'sem_reagendamento'])
        ->assertForbidden();

    $this->actingAs($this->estagiarioAS)
        ->put(route('work-orders.intern-status', $osCM1->id), ['intern_status' => 'approved', 'intern_reason' => 'Material ok'])
        ->assertRedirect();
    expect($osCM1->fresh()->intern_status)->toBe('approved')
        ->and($osCM1->fresh()->intern_name)->not->toBeNull();

    // Observação do engenheiro: o estagiário não consegue gravar
    $this->actingAs($this->estagiarioAS)->put(route('work-orders.update', $osAS->id), payloadEdicao($osAS->fresh(), ['engineer_comment' => 'tentativa']));
    expect($osAS->fresh()->engineer_comment)->toBeNull();
});

// --- Reprogramação: os 3 modos --------------------------------------------------

it('reprograma conforme a periodicidade', function () {
    $os = ($this->novaOs)();
    $this->actingAs($this->engenheiro)->post(route('work-orders.inactivate', $os->id), ['modo' => 'periodicidade', 'motivo' => 'Navio em cruzeiro'])->assertSessionHasNoErrors();

    $os->refresh();
    $nova = WorkOrder::where('rescheduled_from_id', $os->id)->first();
    expect($os->is_inactive)->toBeTrue()->and($os->status)->toBe('cancelled')
        ->and($os->inactivation_reason)->toBe('Navio em cruzeiro')
        ->and($os->inactivated_by)->toBe($this->engenheiro->id)
        ->and($nova->created_at->format('Y-m-d'))->toBe('2026-04-10')
        ->and($nova->status)->toBe('open')
        ->and($nova->in_52_week_plan)->toBeTrue();
});

it('reprograma para nova data e reancora as ocorrências futuras', function () {
    $os = ($this->novaOs)();
    $abril = ($this->novaOs)(['created_at' => '2026-04-10']);
    $maio = ($this->novaOs)(['created_at' => '2026-05-10']);

    $this->actingAs($this->coordenador)->post(route('work-orders.inactivate', $os->id), ['modo' => 'nova_data', 'nova_data' => '2026-03-25'])->assertSessionHasNoErrors();

    $nova = WorkOrder::where('rescheduled_from_id', $os->id)->first();
    expect($nova->created_at->format('Y-m-d'))->toBe('2026-03-25')
        ->and($abril->fresh()->created_at->format('Y-m-d'))->toBe('2026-04-25')
        ->and($maio->fresh()->created_at->format('Y-m-d'))->toBe('2026-05-25');
});

it('inativa sem reagendar', function () {
    $os = ($this->novaOs)();
    $this->actingAs($this->engenheiro)->post(route('work-orders.inactivate', $os->id), ['modo' => 'sem_reagendamento'])->assertSessionHasNoErrors();

    expect($os->fresh()->is_inactive)->toBeTrue()
        ->and(WorkOrder::where('rescheduled_from_id', $os->id)->exists())->toBeFalse()
        ->and(WorkOrder::count())->toBe(1);
});

it('refaz a reprogramação em cadeia nos 3 modos', function () {
    $os = ($this->novaOs)();

    // 1ª: periodicidade -> nasce a de abril
    $this->actingAs($this->engenheiro)->post(route('work-orders.inactivate', $os->id), ['modo' => 'periodicidade'])->assertSessionHasNoErrors();
    $segunda = WorkOrder::where('rescheduled_from_id', $os->id)->firstOrFail();

    // 2ª: a de abril vai para nova data
    $this->actingAs($this->engenheiro)->post(route('work-orders.inactivate', $segunda->id), ['modo' => 'nova_data', 'nova_data' => '2026-04-20'])->assertSessionHasNoErrors();
    $terceira = WorkOrder::where('rescheduled_from_id', $segunda->id)->firstOrFail();
    expect($terceira->created_at->format('Y-m-d'))->toBe('2026-04-20');

    // 3ª: a de 20/04 é reprogramada de novo pela periodicidade (a partir de 20/04)
    $this->actingAs($this->engenheiro)->post(route('work-orders.inactivate', $terceira->id), ['modo' => 'periodicidade'])->assertSessionHasNoErrors();
    $quarta = WorkOrder::where('rescheduled_from_id', $terceira->id)->firstOrFail();
    expect($quarta->created_at->format('Y-m-d'))->toBe('2026-05-20');

    // 4ª: a última é inativada sem reagendar -> fim da cadeia
    $this->actingAs($this->engenheiro)->post(route('work-orders.inactivate', $quarta->id), ['modo' => 'sem_reagendamento'])->assertSessionHasNoErrors();
    expect(WorkOrder::where('rescheduled_from_id', $quarta->id)->exists())->toBeFalse()
        ->and(WorkOrder::where('is_inactive', true)->count())->toBe(4)
        ->and(WorkOrder::where('is_inactive', false)->count())->toBe(0);

    // Não deixa inativar duas vezes a mesma OS
    $this->actingAs($this->engenheiro)->post(route('work-orders.inactivate', $os->id), ['modo' => 'periodicidade'])->assertSessionHasErrors('status');

    // Números de OS não se repetem na cadeia
    expect(WorkOrder::pluck('os_number')->duplicates())->toBeEmpty();
});

it('bloqueia reprogramação de OS sem periodicidade e de quem não é gestão', function () {
    $avulsa = ($this->novaOs)(['periodicity' => null]);
    $this->actingAs($this->engenheiro)->post(route('work-orders.inactivate', $avulsa->id), ['modo' => 'periodicidade'])->assertSessionHasErrors('periodicity');

    $os = ($this->novaOs)();
    foreach (['marinheiro', 'tecnico', 'estagiarioAS'] as $perfil) {
        $this->actingAs($this->{$perfil})->post(route('work-orders.inactivate', $os->id), ['modo' => 'sem_reagendamento'])->assertForbidden();
    }
    expect($os->fresh()->is_inactive)->toBeFalse();
});

// --- Trava no servidor: editar, excluir e avaliar ----------------------------

it('só gestão e o estagiário da embarcação excluem OS', function () {
    foreach (['marinheiro' => 403, 'tecnico' => 403] as $perfil => $codigo) {
        $os = ($this->novaOs)();
        $this->actingAs($this->{$perfil})->delete(route('work-orders.destroy', $os->id))->assertStatus($codigo);
        expect(WorkOrder::whereKey($os->id)->exists())->toBeTrue();
    }

    $osCM1 = ($this->novaOs)(['equipment_id' => $this->eqCM1->id, 'os_number' => 'CM10001']);
    $this->actingAs($this->estagiarioAS)->delete(route('work-orders.destroy', $osCM1->id))->assertForbidden();

    foreach (['engenheiro', 'coordenador', 'estagiarioAS'] as $perfil) {
        $os = ($this->novaOs)();
        $this->actingAs($this->{$perfil})->delete(route('work-orders.destroy', $os->id))->assertRedirect();
        expect(WorkOrder::whereKey($os->id)->exists())->toBeFalse();
    }
});

it('só gestão e o estagiário da embarcação editam OS', function () {
    $os = ($this->novaOs)(['description' => 'original']);
    foreach (['marinheiro', 'tecnico'] as $perfil) {
        $this->actingAs($this->{$perfil})->put(route('work-orders.update', $os->id), payloadEdicao($os, ['description' => 'invadida']))->assertForbidden();
    }
    expect($os->fresh()->description)->toBe('original');

    // Coordenador edita e muda status
    $this->actingAs($this->coordenador)->put(route('work-orders.update', $os->id), payloadEdicao($os, ['description' => 'pelo coordenador', 'status' => 'in_progress']))->assertSessionHasNoErrors();
    expect($os->fresh()->description)->toBe('pelo coordenador')->and($os->fresh()->status)->toBe('in_progress');

    // Estagiário edita a do AS, mas não leva a OS para um equipamento do CM1
    $this->actingAs($this->estagiarioAS)->put(route('work-orders.update', $os->id), payloadEdicao($os->fresh(), ['description' => 'pelo estagiário']))->assertSessionHasNoErrors();
    expect($os->fresh()->description)->toBe('pelo estagiário');
    $this->actingAs($this->estagiarioAS)->put(route('work-orders.update', $os->id), payloadEdicao($os->fresh(), ['equipment_id' => $this->eqCM1->id]))->assertForbidden();
    expect($os->fresh()->equipment_id)->toBe($this->eqAS->id);
});

it('só estagiário e gestão avaliam a OS', function () {
    $os = ($this->novaOs)();
    $this->actingAs($this->marinheiro)->put(route('work-orders.intern-status', $os->id), ['intern_status' => 'approved'])->assertForbidden();
    $this->actingAs($this->tecnico)->put(route('work-orders.intern-status', $os->id), ['intern_status' => 'approved'])->assertForbidden();
    expect($os->fresh()->intern_status)->not->toBe('approved');

    $this->actingAs($this->coordenador)->put(route('work-orders.intern-status', $os->id), ['intern_status' => 'waiting', 'intern_reason' => 'Falta filtro'])->assertRedirect();
    expect($os->fresh()->intern_status)->toBe('waiting');
});

it('coordenador muda o status pelo seletor rápido', function () {
    $os = ($this->novaOs)();
    $this->actingAs($this->coordenador)->put(route('work-orders.update-status', $os->id), ['status' => 'in_progress'])->assertRedirect();
    expect($os->fresh()->status)->toBe('in_progress');
    $this->actingAs($this->marinheiro)->put(route('work-orders.update-status', $os->id), ['status' => 'completed'])->assertForbidden();
});
