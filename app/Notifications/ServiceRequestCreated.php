<?php

namespace App\Notifications;

use App\Models\ServiceRequest;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ServiceRequestCreated extends Notification
{
    public function __construct(public ServiceRequest $serviceRequest)
    {
    }

    /**
     * E-mail + sino do perfil para o terceiro responsável pela solicitação.
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $sr = $this->serviceRequest;

        return (new MailMessage)
            ->subject("[SIGMAN] Nova Solicitação de Serviço {$sr->ss_number}")
            ->greeting("Olá, {$notifiable->nickname}!")
            ->line("Uma nova Solicitação de Serviço foi atribuída à sua empresa.")
            ->line("**SS:** {$sr->ss_number}")
            ->line("**Embarcação:** " . ($sr->vessel->name ?? 'Não informada'))
            ->line("**Equipamento:** " . ($sr->equipment->name ?? 'Não informado') . " (TAG: " . ($sr->tag_number ?? '-') . ")")
            ->line("**Prioridade:** {$this->priorityLabel()}")
            ->line("**Data desejada:** " . ($sr->desired_date ? $sr->desired_date->format('d/m/Y') : 'Não informada'))
            ->line("**Descrição:** {$sr->description}")
            ->salutation('SIGMAN - Sistema de Gestão de Manutenção Naval');
    }

    /**
     * Aparece no sino do perfil do terceiro.
     */
    public function toArray(object $notifiable): array
    {
        $sr = $this->serviceRequest;

        return [
            'type'               => 'service_request_created',
            'service_request_id' => $sr->id,
            'ss_number'          => $sr->ss_number,
            'vessel'             => $sr->vessel->name ?? null,
            'equipment'          => $sr->equipment->name ?? null,
            'priority'           => $sr->priority,
            'title'              => "Nova SS {$sr->ss_number}",
            'message'            => "Nova Solicitação de Serviço {$sr->ss_number} atribuída à sua empresa.",
        ];
    }

    private function priorityLabel(): string
    {
        return match ($this->serviceRequest->priority) {
            'low'    => 'Baixa',
            'normal' => 'Normal',
            'high'   => 'Alta',
            'urgent' => 'Urgente',
            default  => $this->serviceRequest->priority,
        };
    }
}
