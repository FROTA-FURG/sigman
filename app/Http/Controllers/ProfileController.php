<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    // Perfis que podem excluir a própria conta (espelha o MANAGER_ROLES de ThirdPartyController)
    private const SELF_DELETE_ROLES = ['dev', 'coordinator', 'engineer'];

    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        $roleName = $request->user()->role->name ?? null;

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
            'canDeleteAccount' => in_array($roleName, self::SELF_DELETE_ROLES, true),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $roleName = $request->user()->role->name ?? null;

        if (! in_array($roleName, self::SELF_DELETE_ROLES, true)) {
            abort(403, 'Seu perfil não tem permissão para excluir a própria conta.');
        }

        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
