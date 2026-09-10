<?php

namespace App\Notifications;

use App\Models\ExecutionWindow;
use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ExecutionWindowCreated extends Notification
{
    public function __construct(
        public ExecutionWindow $executionWindow,
        public User $creator,
    ) {
    }

    /**
     * Sino do perfil + e-mail do engenheiro e dos demais estagiários da embarcação.
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $window = $this->executionWindow;
        $criadorNome = $this->creatorName();

        return (new MailMessage)
            ->subject("[SIGMAN] Nova Janela de Execução - {$this->vesselName()}")
            ->greeting("Olá, {$notifiable->nickname}!")
            ->line("**{$criadorNome}** criou uma nova Janela de Execução.")
            ->line("**Embarcação:** {$this->vesselName()}")
            ->line("**Período:** " . $this->periodoLabel())
            ->action('Ver Janela de Execução', route('execution-windows.show', $window->id))
            ->salutation('SIGMAN - Sistema de Gestão de Manutenção Naval');
    }

    public function toArray(object $notifiable): array
    {
        $criadorNome = $this->creatorName();

        return [
            'type'                 => 'execution_window_created',
            'execution_window_id'  => $this->executionWindow->id,
            'vessel'               => $this->vesselName(),
            'created_by'           => $criadorNome,
            'title'                => "Nova Janela de Execução - {$this->vesselName()}",
            'message'              => "{$criadorNome} criou uma Janela de Execução para {$this->vesselName()} ({$this->periodoLabel()}).",
        ];
    }

    private function vesselName(): string
    {
        return $this->executionWindow->vessel->name ?? 'Embarcação não informada';
    }

    private function creatorName(): string
    {
        return $this->creator->nickname ?: $this->creator->username;
    }

    private function periodoLabel(): string
    {
        return $this->executionWindow->start_date->format('d/m/Y') . ' a ' . $this->executionWindow->end_date->format('d/m/Y');
    }
}
