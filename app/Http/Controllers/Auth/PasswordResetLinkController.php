<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    /**
     * Display the password reset link request view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/ForgotPassword', [
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming password reset link request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        // We will send the password reset link to this user. Once we have attempted
        // to send the link, we will examine the response then see the message we
        // need to show to the user. Finally, we'll send out a proper response.
        $status = Password::sendResetLink(
            $request->only('email')
        );

        if ($status == Password::RESET_LINK_SENT) {
            return back()->with('status', 'Enviamos um link de redefinição de senha para o seu e-mail.');
        }

        throw ValidationException::withMessages([
            'email' => [$this->translateStatus($status)],
        ]);
    }

    /**
     * O SIGMAN é todo em português — as strings padrão do Password broker vêm em inglês.
     */
    private function translateStatus(string $status): string
    {
        return match ($status) {
            Password::INVALID_USER => 'Não encontramos nenhum usuário com esse e-mail.',
            Password::RESET_THROTTLED => 'Aguarde um pouco antes de solicitar outro link de redefinição.',
            default => 'Não foi possível enviar o link de redefinição. Tente novamente.',
        };
    }
}
