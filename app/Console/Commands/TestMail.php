<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

#[Signature('app:test-mail {email : E-mail que vai receber o teste}')]
#[Description('Envia um e-mail de teste para conferir se o SMTP está configurado')]
class TestMail extends Command
{
    public function handle()
    {
        $email = $this->argument('email');

        $this->info('Enviando via ' . config('mail.mailers.smtp.host') . ':' . config('mail.mailers.smtp.port') . ' ...');

        try {
            Mail::raw('Se você está lendo isto, o SMTP do SIGMAN está funcionando.', function ($message) use ($email) {
                $message->to($email)->subject('[SIGMAN] Teste de envio de e-mail');
            });
        } catch (\Throwable $e) {
            $this->error('Falhou: ' . $e->getMessage());

            return self::FAILURE;
        }

        $this->info("E-mail enviado para {$email}. Confira a caixa de entrada (e o spam).");

        return self::SUCCESS;
    }
}
