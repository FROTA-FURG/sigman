<?php

namespace App\Http\Controllers;

use App\Models\ThirdParty;
use App\Models\User;
use App\Services\ThirdPartyService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ThirdPartyController extends Controller
{
    // Perfis que podem gerir empresas terceirizadas (espelha o canManageUsers da Tripulação)
    private const MANAGER_ROLES = ['dev', 'coordinator', 'engineer'];

    protected $thirdPartyService;

    public function __construct(ThirdPartyService $thirdPartyService)
    {
        $this->thirdPartyService = $thirdPartyService;
    }

    public function index()
    {
        $this->authorizeManager();

        return Inertia::render('ThirdParties/Index', [
            'thirdParties' => $this->thirdPartyService->getAllThirdParties(),
            'historyThirdParties' => ThirdParty::withTrashed()->with('users')->orderBy('razao_social')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $this->authorizeManager();

        $validated = $request->validate([
            'razao_social' => 'required|string|max:255',
            'cnpj'         => 'required|string|max:18|unique:third_parties,cnpj',
            'contact_name' => 'nullable|string|max:255',
            'email'        => 'required|string|email|max:255|unique:users,email',
            'phone'        => 'nullable|string|max:20',
            'password'     => 'required|string|min:8',
            'status'       => 'nullable|string',
        ]);

        $validated['last_updated_by'] = $request->user()->username ?? 'Sistema';

        $this->thirdPartyService->createThirdParty($validated);

        return redirect()->back()->with('success', 'Terceiro cadastrado com sucesso!');
    }

    public function update(Request $request, string $id)
    {
        $this->authorizeManager();

        $thirdParty = ThirdParty::findOrFail($id);
        $loginId = $thirdParty->users()->first()?->id;

        $validated = $request->validate([
            'razao_social' => 'required|string|max:255',
            'cnpj'         => 'required|string|max:18|unique:third_parties,cnpj,'.$id,
            'contact_name' => 'nullable|string|max:255',
            'email'        => 'required|string|email|max:255|unique:users,email'.($loginId ? ','.$loginId : ''),
            'phone'        => 'nullable|string|max:20',
            'password'     => 'nullable|string|min:8',
            'status'       => 'nullable|string',
        ]);

        $validated['last_updated_by'] = $request->user()->username ?? 'Sistema';

        $this->thirdPartyService->updateThirdParty($id, $validated);

        return redirect()->back()->with('success', 'Terceiro atualizado com sucesso!');
    }

    public function destroy(string $id)
    {
        $this->authorizeManager();

        $thirdParty = ThirdParty::findOrFail($id);
        $thirdParty->update(['status' => 'Inactive']);

        // Desativa também os logins de acesso da empresa
        $thirdParty->users()->update(['status' => 'Terminated']);
        $thirdParty->users()->delete();
        $thirdParty->delete();

        return redirect()->back()->with('success', 'Terceiro desativado com sucesso!');
    }

    public function restore(string $id)
    {
        $this->authorizeManager();

        $thirdParty = ThirdParty::withTrashed()->findOrFail($id);
        $thirdParty->restore();
        $thirdParty->update(['status' => 'Active']);

        // Reativa os logins vinculados
        User::withTrashed()->where('third_party_id', $id)->restore();
        User::where('third_party_id', $id)->update(['status' => 'Active']);

        return redirect()->back()->with('success', 'Terceiro reativado com sucesso!');
    }

    /**
     * Só managers gerenciam terceiros. (O próprio terceiro nem chega aqui:
     * o middleware third_party já bloqueia estas rotas para ele.)
     */
    private function authorizeManager(): void
    {
        $roleName = auth()->user()->role->name ?? null;

        if (! in_array($roleName, self::MANAGER_ROLES, true)) {
            abort(403, 'Acesso restrito à gestão de terceiros.');
        }
    }
}
