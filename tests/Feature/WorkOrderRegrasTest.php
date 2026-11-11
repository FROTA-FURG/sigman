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

it('estagiário: status, checagem e inativação só na OS da própria embarcação', function () {
    $osAS = ($this->novaOs)();
    $osCM1 = ($this->novaOs)(['equipment_id' => $this->eqCM1->id, 'os_number' => 'CM10001']);

    $this->actingAs($this->estagiarioAS)->put(route('work-orders.update-status', $osAS->id), ['status' => 'in_progress'])->assertRedirect();
    expect($osAS->fresh()->status)->toBe('in_progress');

    $this->actingAs($this->estagiarioAS)->put(route('work-orders.update-status', $osCM1->id), ['status' => 'in_progress'])->assertForbidden();

    // Checagem: só na embarcação dele (antes o servidor não conferia)
    $this->actingAs($this->estagiarioAS)
        ->put(route('work-orders.intern-status', $osCM1->id), ['intern_status' => 'approved', 'intern_reason' => 'Material ok'])
        ->assertForbidden();
    expect($osCM1->fresh()->intern_status)->not->toBe('approved');

    $this->actingAs($this->estagiarioAS)
        ->put(route('work-orders.intern-status', $osAS->id), ['intern_status' => 'approved', 'intern_reason' => 'Material ok'])
        ->assertRedirect();
    expect($osAS->fresh()->intern_status)->toBe('approved')
        ->and($osAS->fresh()->intern_name)->not->toBeNull();

    // Inativar/reprogramar: na embarcação dele sim, na dos outros não
    $this->actingAs($this->estagiarioAS)->post(route('work-orders.inactivate', $osCM1->id), ['modo' => 'sem_reagendamento'])->assertForbidden();
    $outra = ($this->novaOs)();
    $this->actingAs($this->estagiarioAS)->post(route('work-orders.inactivate', $outra->id), ['modo' => 'sem_reagendamento'])->assertSessionHasNoErrors();
    expect($outra->fresh()->is_inactive)->toBeTrue()
        ->and($outra->fresh()->inactivated_by)->toBe($this->estagiarioAS->id);

    // Observação do engenheiro: o estagiário não consegue gravar
    $this->actingAs($this->estagiarioAS)->put(route('work-orders.update', $osAS->id), payloadEdicao($osAS->fresh(), ['engineer_comment' => 'tentativa']));
    expect($osAS->fresh()->engineer_comment)->toBeNull();
});

it('registra no histórico quem checou, escreveu, disparou e reprogramou', function () {
    // Data futura: agendar uma OS atrasada é barrado (ver o teste da trava de agendamento).
    $os = ($this->novaOs)(['created_at' => now()->addMonth()->toDateString()]);

    // Estagiário: aguardar com motivo -> aprovar -> volta a pendente
    $this->actingAs($this->estagiarioAS)->put(route('work-orders.intern-status', $os->id), ['intern_status' => 'waiting', 'intern_reason' => 'Falta filtro']);
    $this->actingAs($this->estagiarioAS)->put(route('work-orders.intern-status', $os->id), ['intern_status' => 'approved', 'intern_reason' => 'Filtro chegou']);
    $nomeEstagiario = $os->fresh()->intern_name;

    // Engenheiro mexe só no texto: não troca quem checou
    $this->actingAs($this->engenheiro)->put(route('work-orders.intern-status', $os->id), ['intern_status' => 'approved', 'intern_reason' => 'Conferir torque']);
    expect($os->fresh()->intern_name)->toBe($nomeEstagiario)
        ->and($os->fresh()->intern_reason)->toBe('Conferir torque');

    // Comentário do engenheiro e disparo pelo estagiário
    $this->actingAs($this->engenheiro)->put(route('work-orders.update', $os->id), payloadEdicao($os->fresh(), ['engineer_comment' => 'Usar óleo 15W40']));
    $this->actingAs($this->estagiarioAS)->put(route('work-orders.update-status', $os->id), ['status' => 'scheduled'])->assertRedirect();

    $eventos = $os->fresh()->events;
    expect($eventos->pluck('action')->all())->toBe(['checagem', 'checagem', 'observacao', 'comentario_engenheiro', 'disparo'])
        ->and($eventos[0]->only(['user_role', 'from_value', 'to_value', 'note']))->toBe(['user_role' => 'intern', 'from_value' => 'pending', 'to_value' => 'waiting', 'note' => 'Falta filtro'])
        ->and($eventos[2]->only(['user_role', 'note']))->toBe(['user_role' => 'engineer', 'note' => 'Conferir torque'])
        ->and($eventos[3]->note)->toBe('Usar óleo 15W40')
        ->and($eventos[4]->only(['user_id', 'user_role', 'from_value', 'to_value']))->toBe(['user_id' => $this->estagiarioAS->id, 'user_role' => 'intern', 'from_value' => 'open', 'to_value' => 'scheduled']);

    // Reprogramação pelo estagiário: fica na antiga e na nova
    $os2 = ($this->novaOs)();
    $this->actingAs($this->estagiarioAS)->post(route('work-orders.inactivate', $os2->id), ['modo' => 'nova_data', 'nova_data' => '2026-04-20', 'motivo' => 'Embarcação em cruzeiro']);
    $nova = WorkOrder::where('rescheduled_from_id', $os2->id)->firstOrFail();
    expect($os2->fresh()->events->last()->only(['action', 'from_value', 'note', 'user_role']))
        ->toBe(['action' => 'inativacao', 'from_value' => 'nova_data', 'note' => 'Embarcação em cruzeiro', 'user_role' => 'intern'])
        ->and($nova->events->first()->only(['action', 'from_value']))->toBe(['action' => 'reprogramada_de', 'from_value' => $os2->os_number]);
});

it('dispara mesmo com a checagem em Aguardando, mas só com o motivo escrito', function () {
    $os = ($this->novaOs)(['intern_status' => 'waiting', 'intern_reason' => 'Falta a peça']);

    $this->actingAs($this->engenheiro)->put(route('work-orders.update-status', $os->id), ['status' => 'in_progress'])
        ->assertSessionHasErrors('justificativa');
    expect($os->fresh()->status)->toBe('open');

    $this->actingAs($this->engenheiro)->put(route('work-orders.update-status', $os->id), ['status' => 'in_progress', 'justificativa' => 'Peça chega de manhã'])
        ->assertSessionHasNoErrors();
    $evento = $os->fresh()->events->last();
    expect($os->fresh()->status)->toBe('in_progress')
        ->and($evento->action)->toBe('disparo')
        ->and($evento->user_role)->toBe('engineer')
        ->and($evento->note)->toContain('Aguardando')->toContain('Falta a peça')->toContain('Peça chega de manhã');

    // Já agendada: antecipar para andamento também conta como disparo
    $agendada = ($this->novaOs)(['status' => 'scheduled', 'intern_status' => 'waiting']);
    $this->actingAs($this->engenheiro)->put(route('work-orders.update-status', $agendada->id), ['status' => 'in_progress'])
        ->assertSessionHasErrors('justificativa');
    $this->actingAs($this->engenheiro)->put(route('work-orders.update-status', $agendada->id), ['status' => 'in_progress', 'justificativa' => 'Urgente'])
        ->assertSessionHasNoErrors();
    expect($agendada->fresh()->status)->toBe('in_progress');
});

it('não agenda OS atrasada na data que passou; reagenda para o próximo ciclo ou nova data', function () {
    \Illuminate\Support\Carbon::setTestNow('2026-11-10 12:00:00');

    // Mensal prevista em 10/08: atrasada.
    $os = ($this->novaOs)(['created_at' => '2026-08-10']);
    $this->actingAs($this->estagiarioAS)->put(route('work-orders.update-status', $os->id), ['status' => 'scheduled'])
        ->assertSessionHasErrors('status');
    expect($os->fresh()->status)->toBe('open');

    // Próximo ciclo: pula setembro/outubro/novembro (10/11 é hoje) e cai em 10/12, já agendada.
    $this->actingAs($this->estagiarioAS)->post(route('work-orders.inactivate', $os->id), ['modo' => 'periodicidade', 'agendar' => true])
        ->assertSessionHasNoErrors();
    $nova = WorkOrder::where('rescheduled_from_id', $os->id)->firstOrFail();
    expect($nova->created_at->toDateString())->toBe('2026-12-10')
        ->and($nova->status)->toBe('scheduled')
        ->and($os->fresh()->is_inactive)->toBeTrue()
        ->and($os->fresh()->events->last()->action)->toBe('reagendamento');

    // Nova data: precisa ser no futuro; vale também para OS avulsa.
    $avulsa = ($this->novaOs)(['created_at' => '2026-09-01', 'periodicity' => null]);
    $this->actingAs($this->engenheiro)->post(route('work-orders.inactivate', $avulsa->id), ['modo' => 'nova_data', 'nova_data' => '2026-11-10', 'agendar' => true])
        ->assertSessionHasErrors('nova_data');
    $this->actingAs($this->engenheiro)->post(route('work-orders.inactivate', $avulsa->id), ['modo' => 'nova_data', 'nova_data' => '2026-11-20', 'agendar' => true])
        ->assertSessionHasNoErrors();
    expect(WorkOrder::where('rescheduled_from_id', $avulsa->id)->first()->only(['status', 'periodicity']))->toBe(['status' => 'scheduled', 'periodicity' => null]);

    \Illuminate\Support\Carbon::setTestNow();
});

it('depois que a engenharia aprova, só a gestão muda a checagem', function () {
    $os = ($this->novaOs)(['created_at' => now()->addMonth()->toDateString()]);

    // Antes da engenharia: o estagiário vai e volta à vontade
    $this->actingAs($this->estagiarioAS)->put(route('work-orders.intern-status', $os->id), ['intern_status' => 'approved'])->assertRedirect();
    $this->actingAs($this->estagiarioAS)->put(route('work-orders.intern-status', $os->id), ['intern_status' => 'waiting', 'intern_reason' => 'Falta peça'])->assertRedirect();
    $this->actingAs($this->estagiarioAS)->put(route('work-orders.intern-status', $os->id), ['intern_status' => 'approved'])->assertRedirect();

    // Engenheiro dispara (validação final: approved_at)
    $this->actingAs($this->engenheiro)->put(route('work-orders.update-status', $os->id), ['status' => 'scheduled'])->assertSessionHasNoErrors();
    expect($os->fresh()->approved_at)->not->toBeNull();

    // Estagiário não volta mais para Aguardando
    $this->actingAs($this->estagiarioAS)->put(route('work-orders.intern-status', $os->id), ['intern_status' => 'waiting', 'intern_reason' => 'Falta peça de novo'])->assertForbidden();
    expect($os->fresh()->intern_status)->toBe('approved');

    // Engenheiro desfaz: aprovação dele some e fica no histórico
    $this->actingAs($this->engenheiro)->put(route('work-orders.intern-status', $os->id), ['intern_status' => 'waiting', 'intern_reason' => 'Peça atrasou'])->assertRedirect();
    expect($os->fresh()->intern_status)->toBe('waiting')
        ->and($os->fresh()->approved_at)->toBeNull()
        ->and($os->fresh()->events->pluck('action')->last())->toBe('aprovacao_desfeita');

    // Checagem aprovada pelo engenheiro (sem disparo) também trava o estagiário
    $outra = ($this->novaOs)();
    $this->actingAs($this->engenheiro)->put(route('work-orders.intern-status', $outra->id), ['intern_status' => 'approved'])->assertRedirect();
    $this->actingAs($this->estagiarioAS)->put(route('work-orders.intern-status', $outra->id), ['intern_status' => 'pending'])->assertForbidden();
});

it('o modal de edição também não agenda OS atrasada e mostra o motivo', function () {
    $os = ($this->novaOs)(['created_at' => '2026-01-10']);
    $this->actingAs($this->engenheiro)->put(route('work-orders.update', $os->id), payloadEdicao($os, ['status' => 'scheduled']))
        ->assertSessionHasErrors(['status' => 'Esta OS está atrasada (ou é para hoje): não dá para agendá-la nessa data. Dispare agora ou reagende para o próximo ciclo ou uma nova data.']);
    expect($os->fresh()->status)->toBe('open');

    // Mudando a data para o futuro junto, agenda e registra no histórico
    $futura = now()->addMonths(2)->toDateString();
    $this->actingAs($this->engenheiro)->put(route('work-orders.update', $os->id), payloadEdicao($os->fresh(), ['status' => 'scheduled', 'created_at' => $futura]))
        ->assertSessionHasNoErrors();
    expect($os->fresh()->status)->toBe('scheduled')
        ->and($os->fresh()->events->last()->only(['action', 'from_value', 'to_value']))->toBe(['action' => 'status', 'from_value' => 'open', 'to_value' => 'scheduled']);
});

it('manda para a tela só as OS que o usuário pode ver', function () {
    ($this->novaOs)();
    ($this->novaOs)(['equipment_id' => $this->eqCM1->id, 'os_number' => 'CM10001']);
    $semEmbarcacao = User::factory()->create(['role_id' => Role::firstOrCreate(['name' => 'intern'])->id, 'vessel_id' => null]);
    $frota = User::factory()->create(['has_fleet_access' => true]);

    $this->actingAs($this->estagiarioAS)->get(route('work-orders.index'))
        ->assertInertia(fn ($page) => $page->has('workOrders', 1)->where('workOrders.0.equipment.vessel.tag', 'AS'));
    $this->actingAs($semEmbarcacao)->get(route('work-orders.index'))
        ->assertInertia(fn ($page) => $page->has('workOrders', 0));
    $this->actingAs($frota)->get(route('work-orders.index'))
        ->assertInertia(fn ($page) => $page->has('workOrders', 2));

    // Abrir a OS de outra embarcação pela URL também é barrado
    $osCM1 = WorkOrder::where('os_number', 'CM10001')->first();
    $this->actingAs($this->estagiarioAS)->get(route('work-orders.show', $osCM1->id))->assertForbidden();
    $this->actingAs($this->engenheiro)->get(route('work-orders.show', $osCM1->id))->assertOk();
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

it('bloqueia reprogramação de OS sem periodicidade e de quem não é gestão nem estagiário', function () {
    $avulsa = ($this->novaOs)(['periodicity' => null]);
    $this->actingAs($this->engenheiro)->post(route('work-orders.inactivate', $avulsa->id), ['modo' => 'periodicidade'])->assertSessionHasErrors('periodicity');

    $os = ($this->novaOs)();
    foreach (['marinheiro', 'tecnico'] as $perfil) {
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

// --- Origem, última atualização, observação do engenheiro, atividades ----------

it('aceita docagem e atividade extra, mas não plano de 52 semanas com atividade extra', function () {
    $base = ['equipment_id' => $this->eqAS->id, 'description' => 'Pintura do casco', 'maintenance_type' => 'corrective', 'priority' => 'high', 'status' => 'open', 'created_at' => '2026-12-01'];

    $this->actingAs($this->engenheiro)->post(route('work-orders.store'), [...$base, 'in_52_week_plan' => true, 'is_extra_activity' => true])
        ->assertSessionHasErrors('is_extra_activity');

    $this->actingAs($this->engenheiro)->post(route('work-orders.store'), [...$base, 'is_docking' => true, 'is_extra_activity' => true])
        ->assertSessionHasNoErrors();
    $os = WorkOrder::where('description', 'Pintura do casco')->firstOrFail();
    expect($os->is_docking)->toBeTrue()->and($os->is_extra_activity)->toBeTrue()->and($os->in_52_week_plan)->toBeFalse();

    // Na edição, marcar o plano numa OS que já é atividade extra também é barrado
    $this->actingAs($this->engenheiro)->put(route('work-orders.update', $os->id), payloadEdicao($os, ['in_52_week_plan' => true]))
        ->assertSessionHasErrors('is_extra_activity');
    $this->actingAs($this->engenheiro)->put(route('work-orders.update', $os->id), payloadEdicao($os, ['in_52_week_plan' => true, 'is_extra_activity' => false]))
        ->assertSessionHasNoErrors();
    expect($os->fresh()->in_52_week_plan)->toBeTrue()->and($os->fresh()->is_docking)->toBeTrue();
});

it('registra quem atualizou a OS por último', function () {
    $os = ($this->novaOs)();
    $this->actingAs($this->estagiarioAS)->put(route('work-orders.update-status', $os->id), ['status' => 'in_progress']);
    expect($os->fresh()->updated_by)->toBe($this->estagiarioAS->id);

    $this->actingAs($this->coordenador)->put(route('work-orders.update', $os->id), payloadEdicao($os->fresh(), ['description' => 'ajustada']));
    expect($os->fresh()->updated_by)->toBe($this->coordenador->id)
        ->and(WorkOrder::with('updater')->find($os->id)->updater->id)->toBe($this->coordenador->id);
});

it('dev não escreve a observação do engenheiro; engenheiro e coordenador sim', function () {
    $os = ($this->novaOs)();
    $dev = User::factory()->create(['role_id' => Role::firstOrCreate(['name' => 'dev'])->id]);

    $this->actingAs($dev)->put(route('work-orders.update', $os->id), payloadEdicao($os, ['engineer_comment' => 'pelo dev']));
    expect($os->fresh()->engineer_comment)->toBeNull();

    $this->actingAs($this->engenheiro)->put(route('work-orders.update', $os->id), payloadEdicao($os->fresh(), ['engineer_comment' => 'pelo engenheiro']));
    expect($os->fresh()->engineer_comment)->toBe('pelo engenheiro');
});

it('lança atividade com o responsável escolhido', function () {
    $os = ($this->novaOs)();
    $this->actingAs($this->estagiarioAS)->post(route('work-order-activities.store'), [
        'work_order_id' => $os->id,
        'responsible_user_id' => $this->marinheiro->id,
        'description' => 'Troca do filtro',
        'started_at' => '2026-03-10T11:00:00Z',
        'completed_at' => '2026-03-10T12:00:00Z',
    ])->assertSessionHasNoErrors();

    $atividade = $os->activities()->firstOrFail();
    expect($atividade->responsible_user_id)->toBe($this->marinheiro->id);

    // Sem escolha, fica quem lançou
    $this->actingAs($this->estagiarioAS)->post(route('work-order-activities.store'), [
        'work_order_id' => $os->id, 'responsible_user_id' => '', 'description' => 'Teste', 'started_at' => '2026-03-11T11:00:00Z',
    ])->assertSessionHasNoErrors();
    expect($os->activities()->where('description', 'Teste')->first()->responsible_user_id)->toBe($this->estagiarioAS->id);
});

it('aceita responsável de fora do sistema e registra quem lançou e quem alterou', function () {
    $os = ($this->novaOs)();
    $this->actingAs($this->estagiarioAS)->post(route('work-order-activities.store'), [
        'work_order_id' => $os->id,
        'responsible_user_id' => $this->marinheiro->id, // ignorado: o nome digitado vale
        'responsible_name' => '  Carlos (técnico WEG) ',
        'description' => 'Alinhamento do eixo',
        'started_at' => '2026-03-10T11:00:00Z',
    ])->assertSessionHasNoErrors();

    $atividade = $os->activities()->firstOrFail();
    expect($atividade->responsible_user_id)->toBeNull()
        ->and($atividade->responsible_name)->toBe('Carlos (técnico WEG)')
        ->and($atividade->created_by)->toBe($this->estagiarioAS->id)
        ->and($atividade->updated_by)->toBe($this->estagiarioAS->id)
        ->and($os->fresh()->updated_by)->toBe($this->estagiarioAS->id); // conta como atualização da OS

    // Outra pessoa edita e volta para um usuário do sistema: o nome some.
    $this->actingAs($this->engenheiro)->put(route('work-order-activities.update', $atividade->id), [
        'responsible_user_id' => $this->marinheiro->id, 'responsible_name' => '',
        'description' => 'Alinhamento do eixo', 'started_at' => '2026-03-10T11:00:00Z',
    ])->assertSessionHasNoErrors();

    $atividade->refresh();
    expect($atividade->responsible_user_id)->toBe($this->marinheiro->id)
        ->and($atividade->responsible_name)->toBeNull()
        ->and($atividade->created_by)->toBe($this->estagiarioAS->id)
        ->and($atividade->updated_by)->toBe($this->engenheiro->id)
        ->and($os->fresh()->updated_by)->toBe($this->engenheiro->id);
});

it('mantém a atividade e o nome de quem executou quando o usuário sai do sistema', function () {
    $os = ($this->novaOs)();
    $this->actingAs($this->engenheiro)->post(route('work-order-activities.store'), [
        'work_order_id' => $os->id, 'responsible_user_id' => $this->marinheiro->id,
        'description' => 'Limpeza do trocador', 'started_at' => '2026-03-10T11:00:00Z',
    ])->assertSessionHasNoErrors();
    $atividade = $os->activities()->firstOrFail();
    $nome = $this->marinheiro->nickname ?: $this->marinheiro->username;

    // Desativado pela tela (soft delete): o vínculo fica e o nome continua vindo.
    $this->marinheiro->delete();
    expect($atividade->fresh()->responsibleUser?->id)->toBe($this->marinheiro->id);

    // Apagado de vez: a atividade fica, sem vínculo, com o nome gravado.
    $this->marinheiro->forceDelete();
    $atividade = $atividade->fresh();
    expect($atividade)->not->toBeNull()
        ->and($atividade->responsible_user_id)->toBeNull()
        ->and($atividade->responsible_name)->toBe($nome);
});

it('não aceita mais docagem como periodicidade', function () {
    $base = ['equipment_id' => $this->eqAS->id, 'description' => 'Docagem', 'maintenance_type' => 'preventive', 'priority' => 'medium', 'status' => 'open', 'created_at' => '2026-12-01'];
    $this->actingAs($this->engenheiro)->post(route('work-orders.store'), [...$base, 'periodicity' => 'docking'])->assertSessionHasErrors('periodicity');
    $this->actingAs($this->engenheiro)->post(route('work-orders.store'), [...$base, 'is_docking' => true])->assertSessionHasNoErrors();
});
