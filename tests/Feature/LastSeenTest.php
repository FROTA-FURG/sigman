<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

it('registra o visto por último em qualquer perfil, no máximo uma vez por minuto', function () {
    Carbon::setTestNow('2026-10-08 10:00:00');
    $marinheiro = User::factory()->create(['role_id' => Role::firstOrCreate(['name' => 'seaman'])->id]);
    $antes = $marinheiro->updated_at;

    $this->actingAs($marinheiro)->get(route('dashboard'));
    expect($marinheiro->fresh()->last_seen_at->toDateTimeString())->toBe('2026-10-08 10:00:00')
        ->and($marinheiro->fresh()->updated_at->eq($antes))->toBeTrue(); // não conta como edição do cadastro

    Carbon::setTestNow('2026-10-08 10:00:30');
    $this->actingAs($marinheiro->fresh())->get(route('dashboard'));
    expect($marinheiro->fresh()->last_seen_at->toDateTimeString())->toBe('2026-10-08 10:00:00');

    Carbon::setTestNow('2026-10-08 10:02:00');
    $this->actingAs($marinheiro->fresh())->get(route('dashboard'));
    expect($marinheiro->fresh()->last_seen_at->toDateTimeString())->toBe('2026-10-08 10:02:00');

    Carbon::setTestNow();
});

it('só dev, coordenador e engenheiro recebem o visto por último na tripulação', function () {
    $engenheiro = User::factory()->create(); // factory cria como engineer
    $estagiario = User::factory()->create(['role_id' => Role::firstOrCreate(['name' => 'intern'])->id]);

    $this->actingAs($engenheiro)
        ->get(route('crew.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('canSeeLastSeen', true)
            ->has('users.0.last_seen_at'));

    $this->actingAs($estagiario)
        ->get(route('crew.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('canSeeLastSeen', false)
            ->missing('users.0.last_seen_at')
            ->missing('users.1.last_seen_at'));
});

it('deixa de aparecer online ao sair, e volta ao entrar de novo', function () {
    Carbon::setTestNow('2026-10-08 10:00:00');
    $engenheiro = User::factory()->create();
    $marinheiro = User::factory()->create(['role_id' => Role::firstOrCreate(['name' => 'seaman'])->id]);

    $this->actingAs($marinheiro)->get(route('dashboard'));
    expect($marinheiro->fresh()->estaOnline())->toBeTrue();

    Carbon::setTestNow('2026-10-08 10:01:00');
    $this->actingAs($marinheiro->fresh())->post(route('logout'));
    $saiu = $marinheiro->fresh();
    expect($saiu->estaOnline())->toBeFalse()
        ->and($saiu->last_seen_at->toDateTimeString())->toBe('2026-10-08 10:01:00');

    $this->actingAs($engenheiro)
        ->get(route('crew.index'))
        ->assertInertia(fn (Assert $page) => $page->where(
            'users',
            fn ($users) => collect($users)->firstWhere('id', $marinheiro->id)['is_online'] === false,
        ));

    Carbon::setTestNow('2026-10-08 10:03:00');
    $this->actingAs($marinheiro->fresh())->get(route('dashboard'));
    expect($marinheiro->fresh()->estaOnline())->toBeTrue();

    Carbon::setTestNow();
});
