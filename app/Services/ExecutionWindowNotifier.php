<?php

namespace App\Services;

use App\Models\ExecutionWindow;
use App\Models\User;
use App\Notifications\ExecutionWindowCreated;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class ExecutionWindowNotifier
{
    /**
     * Avisa quem precisa saber que uma Janela de Execução nova nasceu: os
     * engenheiros que respondem por aquela embarcação (pra aprovarem/dispararem
     * as OS dela) e os demais estagiários alocados na mesma embarcação (pra
     * saberem que existe um lote sendo organizado). Quem criou não recebe
     * aviso da própria ação.
     */
    public function notifyOfCreation(ExecutionWindow $window, User $creator): bool
    {
        $window->loadMissing('vessel');

        $recipients = $this->resolveRecipients($window, $creator);

        if ($recipients->isEmpty()) {
            return false;
        }

        try {
            Notification::send($recipients, new ExecutionWindowCreated($window, $creator));
        } catch (\Throwable $e) {
            Log::error("Falha ao notificar criação da Janela de Execução {$window->id}: {$e->getMessage()}");

            return false;
        }

        return true;
    }

    /**
     * @return Collection<int, User>
     */
    private function resolveRecipients(ExecutionWindow $window, User $creator): Collection
    {
        $vesselId = $window->vessel_id;

        $engineers = User::query()
            ->whereHas('role', fn ($q) => $q->where('name', 'engineer'))
            ->whereNotNull('email')
            ->get()
            ->filter(fn ($engineer) => $engineer->coversVessel($vesselId));

        $interns = User::query()
            ->whereHas('role', fn ($q) => $q->where('name', 'intern'))
            ->where('vessel_id', $vesselId)
            ->whereNotNull('email')
            ->get();

        return $engineers->concat($interns)
            ->unique('id')
            ->reject(fn ($user) => $user->id === $creator->id)
            ->values();
    }
}
