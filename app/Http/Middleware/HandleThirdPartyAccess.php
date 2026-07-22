<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class HandleThirdPartyAccess
{
    /**
     * O terceiro (empresa terceirizada) tem acesso restrito ao sistema.
     * Este middleware é a trava central: se o usuário logado for terceiro,
     * só deixa passar as rotas da whitelist; qualquer outra vira 403.
     *
     * O escopo dos DADOS (ver só as OS dele) é reforçado nos controllers —
     * aqui cuidamos apenas de quais telas/rotas ele pode alcançar.
     */
    private const ALLOWED_ROUTES = [
        'dashboard',
        'work-orders.index',
        'work-orders.show',
        'work-order-activities.store',
        'notifications.read',
        'notifications.read-all',
        'notifications.destroy',
        'notifications.destroy-all',
        'profile.edit',
        'profile.update',
        'profile.destroy',
        'logout',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Só restringe o terceiro; os demais perfis passam direto (comportamento atual).
        if ($user && ($user->role->name ?? null) === 'terceiro') {
            $routeName = $request->route()?->getName();

            if (! in_array($routeName, self::ALLOWED_ROUTES, true)) {
                abort(403, 'Acesso não permitido para este perfil.');
            }
        }

        return $next($request);
    }
}
