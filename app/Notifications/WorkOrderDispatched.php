<?php

namespace App\Notifications;

use App\Models\WorkOrder;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class WorkOrderDispatched extends Notification
{
    public function __construct(public WorkOrder $workOrder)
    {
    }

    /**
     * Canais: e-mail do responsável + notificação dentro do perfil (tabela notifications).
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $os = $this->workOrder;

        return (new MailMessage)
            ->subject("[SIGMAN] OS {$os->os_number} disparada - {$this->vesselName()}")
            ->greeting("Olá, {$notifiable->nickname}!")
            ->line("A Ordem de Serviço **{$os->os_number}** foi disparada e está aguardando execução.")
            ->line("**Embarcação:** {$this->vesselName()}")
            ->line("**Equipamento:** " . ($os->equipment->name ?? 'Não informado') . " (TAG: " . ($os->tag_number ?? '-') . ")")
            ->line("**Tipo:** {$this->maintenanceTypeLabel()} | **Prioridade:** {$this->priorityLabel()}")
            ->line("**Data prevista:** " . optional($os->created_at)->format('d/m/Y'))
            ->line("**Descrição:** {$os->description}")
            ->action('Abrir Ordem de Serviço', route('work-orders.show', $os->id))
            ->salutation('SIGMAN - Sistema de Gestão de Manutenção Naval');
    }

    /**
     * Fica salvo no banco e aparece no sino de notificações do perfil.
     */
    public function toArray(object $notifiable): array
    {
        $os = $this->workOrder;

        return [
            'work_order_id' => $os->id,
            'os_number'     => $os->os_number,
            'status'        => $os->status,
            'priority'      => $os->priority,
            'vessel'        => $this->vesselName(),
            'equipment'     => $os->equipment->name ?? null,
            'description'   => $os->description,
            'scheduled_for' => optional($os->created_at)->toDateString(),
            'title'         => "OS {$os->os_number} disparada",
            'message'       => "A OS {$os->os_number} ({$this->vesselName()}) entrou em execução e precisa da sua atenção.",
        ];
    }

    private function vesselName(): string
    {
        return $this->workOrder->equipment->vessel->name ?? 'Embarcação não informada';
    }

    private function maintenanceTypeLabel(): string
    {
        return match ($this->workOrder->maintenance_type) {
            'corrective' => 'Corretiva',
            'preventive' => 'Preventiva',
            'predictive' => 'Preditiva',
            default      => $this->workOrder->maintenance_type,
        };
    }

    private function priorityLabel(): string
    {
        return match ($this->workOrder->priority) {
            'low'      => 'Baixa',
            'medium'   => 'Média',
            'high'     => 'Alta',
            'critical' => 'Crítica',
            default    => $this->workOrder->priority,
        };
    }
}
