<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Atualiza users.last_seen_at a cada requisição autenticada, no máximo uma
 * vez por minuto por usuário (evita um UPDATE por clique). Grava direto na
 * tabela pra não mexer no updated_at nem disparar eventos do model --
 * "visto por último" não é uma edição do cadastro.
 */
class TrackLastSeen
{
    private const INTERVALO_SEGUNDOS = 60;

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && (! $user->last_seen_at || $user->last_seen_at->diffInSeconds(now(), true) >= self::INTERVALO_SEGUNDOS)) {
            $agora = now();
            DB::table('users')->where('id', $user->id)->update(['last_seen_at' => $agora]);
            $user->last_seen_at = $agora;
            $user->syncOriginalAttribute('last_seen_at');
        }

        return $next($request);
    }
}
