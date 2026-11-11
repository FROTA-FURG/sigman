<?php

use App\Models\User;

/*
 * Não existe cadastro público: usuário novo só pela gestão, na Tripulação
 * (crew.store, restrito a dev/coordenador/engenheiro).
 */

test('não existe tela nem rota de cadastro público', function () {
    $this->get('/register')->assertNotFound();

    $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertNotFound();

    $this->assertGuest();
    expect(User::where('email', 'test@example.com')->exists())->toBeFalse();
});
