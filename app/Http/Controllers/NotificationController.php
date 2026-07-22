<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Marca uma notificação como lida (clique no sino do perfil).
     */
    public function markAsRead(Request $request, string $id)
    {
        $notification = $request->user()
            ->notifications()
            ->findOrFail($id);

        $notification->markAsRead();

        return back();
    }

    /**
     * Marca todas as notificações do usuário logado como lidas.
     */
    public function markAllAsRead(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();

        return back();
    }

    /**
     * Apaga uma notificação do sino.
     * O findOrFail sai da relação do usuário logado, então ninguém apaga a do outro.
     */
    public function destroy(Request $request, string $id)
    {
        $request->user()
            ->notifications()
            ->findOrFail($id)
            ->delete();

        return back();
    }

    /**
     * Limpa o sino inteiro do usuário logado.
     */
    public function destroyAll(Request $request)
    {
        $request->user()->notifications()->delete();

        return back();
    }
}
