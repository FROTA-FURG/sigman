<?php

namespace App\Services;

use App\Models\User;
use App\Models\WorkOrder;
use App\Notifications\WorkOrderApproved;
use App\Notifications\WorkOrderDispatched;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class WorkOrderDispatchNotifier
{
    /**
     * Status que significam "OS em vigor" (precisa avisar os responsáveis).
     */
    private const ACTIVE_STATUSES = ['open', 'in_progress'];

    /**
     * Avisa os responsáveis quando a OS entra em vigor.
     *
     * Só dispara se as três condições baterem:
     *   1. Status virou "open" ou "in_progress";
     *   2. A data prevista da OS já chegou (não é OS futura/agendada);
     *   3. A OS ainda não foi disparada antes (trava do dispatched_at).
     *
     * @return bool true se as notificações foram enviadas agora.
     */
    public function notifyIfDispatched(WorkOrder $workOrder): bool
    {
        if (! in_array($workOrder->status, self::ACTIVE_STATUSES, true)) {
            return false;
        }

        if ($workOrder->dispatched_at !== null) {
            return false; // Já avisamos os responsáveis uma vez, não repete.
        }

        if ($workOrder->created_at?->startOfDay()->isFuture()) {
            return false; // OS de data futura: quem avisa é o comando app:check-scheduled-os na data certa.
        }

        $workOrder->loadMissing('equipment.vessel');

        $recipients = $this->resolveRecipients($workOrder);

        if ($recipients->isEmpty()) {
            Log::warning("OS {$workOrder->os_number} disparada, mas nenhum responsável com e-mail foi encontrado.");

            return false;
        }

        try {
            Notification::send($recipients, new WorkOrderDispatched($workOrder));
        } catch (\Throwable $e) {
            // O envio falhar (SMTP fora do ar, etc) não pode derrubar o disparo da OS.
            Log::error("Falha ao notificar responsáveis da OS {$workOrder->os_number}: {$e->getMessage()}");

            return false;
        }

        $workOrder->forceFill(['dispatched_at' => now()])->save();

        return true;
    }

    /**
     * Registra a validação final do engenheiro e avisa os estagiários da embarcação
     * daquela OS: "OS XXXX aprovada por Fulano em dd/mm/aaaa".
     *
     * O estagiário avalia a OS, mas quem dá a palavra final é o engenheiro ao disparar.
     * Só grava e avisa uma vez (trava do approved_at).
     *
     * @return bool true se os estagiários foram avisados agora.
     */
    public function notifyInternsOfApproval(WorkOrder $workOrder, User $engineer): bool
    {
        if ($workOrder->approved_at !== null) {
            return false; // A OS já tinha sido aprovada antes, não avisa de novo.
        }

        $workOrder->forceFill([
            'approved_by' => $engineer->id,
            'approved_at' => now(),
        ])->save();

        $workOrder->loadMissing('equipment.vessel');

        $interns = $this->internsOfVessel($workOrder);

        if ($interns->isEmpty()) {
            return false; // Embarcação sem estagiário vinculado: não há ninguém para avisar.
        }

        try {
            Notification::send($interns, new WorkOrderApproved($workOrder, $engineer));
        } catch (\Throwable $e) {
            Log::error("Falha ao avisar estagiários da aprovação da OS {$workOrder->os_number}: {$e->getMessage()}");

            return false;
        }

        return true;
    }

    /**
     * Estagiários vinculados à embarcação da OS.
     *
     * @return Collection<int, User>
     */
    private function internsOfVessel(WorkOrder $workOrder): Collection
    {
        $vesselId = $workOrder->equipment->vessel_id ?? null;

        if (! $vesselId) {
            return collect();
        }

        return User::query()
            ->whereHas('role', fn ($q) => $q->where('name', 'intern'))
            ->where('vessel_id', $vesselId)
            ->whereNotNull('email')
            ->get();
    }

    /**
     * Quem recebe o aviso da OS: os engenheiros responsáveis +, quando a OS estiver
     * atribuída a uma empresa terceirizada, os logins daquele terceiro.
     *
     * @return Collection<int, User>
     */
    private function resolveRecipients(WorkOrder $workOrder): Collection
    {
        $vesselId = $workOrder->equipment->vessel_id ?? null;

        $engineers = User::query()
            ->whereHas('role', fn ($q) => $q->where('name', 'engineer'))
            ->whereNotNull('email')
            ->get();

        // Prioriza o engenheiro da embarcação da OS. Se ninguém estiver vinculado
        // àquela embarcação, avisa todos os engenheiros para a OS não ficar órfã.
        $ofVessel = $engineers->where('vessel_id', $vesselId);
        $recipients = $ofVessel->isNotEmpty() ? $ofVessel->values() : $engineers;

        // Se a OS pertence a um terceiro, o(s) login(s) dele também são avisados.
        if ($workOrder->third_party_id) {
            $thirdPartyUsers = User::query()
                ->where('third_party_id', $workOrder->third_party_id)
                ->whereNotNull('email')
                ->get();

            $recipients = $recipients->concat($thirdPartyUsers)->unique('id')->values();
        }

        return $recipients;
    }
}
