<?php

namespace App\Notifications;

use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class WorkOrderApproved extends Notification
{
    public function __construct(
        public WorkOrder $workOrder,
        public User $engineer,
    ) {
    }

    /**
     * Sino do perfil + e-mail do estagiário vinculado à embarcação.
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $os = $this->workOrder;
        $engineerName = $this->engineerName();
        $approvedAt = $this->approvedAtLabel();

        return (new MailMessage)
            ->subject("[SIGMAN] OS {$os->os_number} aprovada por {$engineerName}")
            ->greeting("Olá, {$notifiable->nickname}!")
            ->line("A OS **{$os->os_number}** foi aprovada por **{$engineerName}** em {$approvedAt}.")
            ->line("**Embarcação:** " . ($os->equipment->vessel->name ?? 'Não informada'))
            ->line("**Equipamento:** " . ($os->equipment->name ?? 'Não informado') . " (TAG: " . ($os->tag_number ?? '-') . ")")
            ->line("**Descrição:** {$os->description}")
            ->action('Abrir Ordem de Serviço', route('work-orders.show', $os->id))
            ->salutation('SIGMAN - Sistema de Gestão de Manutenção Naval');
    }

    public function toArray(object $notifiable): array
    {
        $os = $this->workOrder;
        $engineerName = $this->engineerName();
        $approvedAt = $this->approvedAtLabel();

        return [
            'type'            => 'work_order_approved',
            'work_order_id'   => $os->id,
            'os_number'       => $os->os_number,
            'vessel'          => $os->equipment->vessel->name ?? null,
            'equipment'       => $os->equipment->name ?? null,
            'approved_by'     => $engineerName,
            'approved_at'     => $approvedAt,
            'title'           => "OS {$os->os_number} aprovada",
            'message'         => "OS {$os->os_number} aprovada por {$engineerName} em {$approvedAt}.",
        ];
    }

    private function engineerName(): string
    {
        return $this->engineer->nickname ?: $this->engineer->username;
    }

    private function approvedAtLabel(): string
    {
        return optional($this->workOrder->approved_at)->format('d/m/Y') ?? now()->format('d/m/Y');
    }
}
