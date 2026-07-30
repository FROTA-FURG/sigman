<?php

namespace App\Http\Controllers;

use App\Services\UserService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use App\Models\Role;
use App\Models\Vessel;

class UserController extends Controller
{
    // Perfis que podem gerir a tripulação, incluindo resetar a senha de outro usuário
    // (espelha o MANAGER_ROLES de ThirdPartyController)
    private const MANAGER_ROLES = ['dev', 'coordinator', 'engineer'];

    protected $userService;

    public function __construct(UserService $userService)
    {
        $this->userService = $userService;
    }

    public function index()
    {
        $users = $this->userService->getAllUsers();
        $historyUsers = \App\Models\User::withTrashed()->with('role')->get();
        $roles = \App\Models\Role::orderBy('name')->get(['id', 'name']);
        $vessels = \App\Models\Vessel::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Crew/Index', [
            'users' => $users,
            'historyUsers' => $historyUsers,
            'roles' => $roles,
            'vessels' => $vessels
        ]);
    }

    public function store(Request $request)
    {
        $this->authorizeManager();

        $validatedData = $request->validate([
            'username' => 'required|string|max:255',
            'nickname' => 'nullable|string|max:255',
            'email'    => 'required|string|email|max:255|unique:users,email',
            'cpf'      => 'required|string|max:14|unique:users,cpf', 
            'phone'    => 'nullable|string|max:15',
            'password' => 'required|string|min:8',
            'role_id'  => 'required|uuid|exists:roles,id', 
            'vessel_id'  => 'required|uuid|exists:vessels,id', 
            'status'   => 'required|string'
        ]);

        // Opcional: Registra quem criou o usuário
        $validatedData['last_updated_by'] = auth()->user()->username ?? 'Sistema';

        $this->userService->createUser($validatedData);

        return redirect()->back()->with('success', 'Funcionário cadastrado com sucesso!');
    }

    public function show(string $id)  
    {
        $user = $this->userService->getUserById($id);

        return Inertia::render('Crew/Show', [
            'user' => $user
        ]);
    }

    public function update(Request $request, string $id)
    {
        $this->authorizeManager();

        $validatedData = $request->validate([
            'username' => 'required|string|max:255',
            'nickname' => 'nullable|string|max:255',
            'email'    => 'required|string|email|max:255|unique:users,email,'.$id,
            'cpf'      => 'required|string|max:14|unique:users,cpf,'.$id,
            'phone'    => 'nullable|string|max:20',
            'role_id'  => 'required|uuid|exists:roles,id',
            'vessel_id'  => 'required|uuid|exists:vessels,id',
            'status'   => 'required|string'
        ]);

        $validatedData['last_updated_by'] = auth()->user()->username;

        $user = $this->userService->updateUser($id, $validatedData);

        if ($validatedData['status'] === 'Terminated') {
            $user->delete();
        }

        return redirect()->back()->with('success', 'Funcionário atualizado com sucesso!');
    }

    /**
     * Reseta a senha de outro usuário (não a do próprio). Restrito a managers.
     */
    public function resetPassword(Request $request, string $id)
    {
        $this->authorizeManager();

        $validated = $request->validate([
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = \App\Models\User::findOrFail($id);
        $user->update([
            'password' => Hash::make($validated['password']),
            'last_updated_by' => auth()->user()->username ?? 'Sistema',
        ]);

        return redirect()->back()->with('success', 'Senha redefinida com sucesso!');
    }

    /**
     * Só dev/coordenador/engenheiro gerenciam a tripulação (mesma trava do ThirdPartyController).
     */
    private function authorizeManager(): void
    {
        $roleName = auth()->user()->role->name ?? null;

        if (! in_array($roleName, self::MANAGER_ROLES, true)) {
            abort(403, 'Acesso restrito à gestão de tripulação.');
        }
    }

    public function destroy(string $id)
    {
        $this->authorizeManager();

        $user = \App\Models\User::findOrFail($id);
        $user->update([
            'status' => 'Terminated',
            'last_updated_by' => auth()->user()->username ?? 'Sistema'
        ]);
        $user->delete();

        return redirect()->back()->with('success', 'Funcionário desligado com sucesso!');
    }

    public function restore(string $id)
    {
        $this->authorizeManager();

        $user = \App\Models\User::withTrashed()->findOrFail($id);
        
        $user->restore();
        
        $user->update([
            'status' => 'Active',
            'last_updated_by' => auth()->user()->username ?? 'Sistema'
        ]);

        return redirect()->back()->with('success', 'Funcionário reativado com sucesso!');
    }
}