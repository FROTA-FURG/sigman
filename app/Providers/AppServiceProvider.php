<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        $this->configurePasswordResetMail();
    }

    /**
     * O SIGMAN é todo em português — a notificação padrão do Laravel vem em inglês,
     * então definimos o conteúdo do e-mail de redefinição de senha aqui.
     */
    private function configurePasswordResetMail(): void
    {
        ResetPassword::toMailUsing(function (object $notifiable, string $token) {
            $url = url(route('password.reset', [
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ], false));

            $expireMinutes = config('auth.passwords.'.config('auth.defaults.passwords').'.expire');

            return (new MailMessage)
                ->subject('[SIGMAN] Redefinição de senha')
                ->greeting('Olá, '.($notifiable->nickname ?? $notifiable->username).'!')
                ->line('Recebemos uma solicitação para redefinir a senha da sua conta no SIGMAN.')
                ->action('Redefinir Senha', $url)
                ->line("Este link expira em {$expireMinutes} minutos.")
                ->line('Se você não solicitou a redefinição de senha, nenhuma ação é necessária — sua senha atual continua válida.')
                ->salutation('SIGMAN - Sistema de Gestão de Manutenção Naval');
        });
    }
}
