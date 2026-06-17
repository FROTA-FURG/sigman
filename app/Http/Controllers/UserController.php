<?php

namespace App\Http\Controllers;

use App\Services\UserService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Role;
use App\Models\Vessel;

class UserController extends Controller
{
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

        $this->userService->updateUser($id, $validatedData);

        if ($validatedData['status'] === 'Terminated') {
            $user->delete();
        }

        return redirect()->back()->with('success', 'Funcionário atualizado com sucesso!');
    }

    public function destroy(string $id)
    {
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
        $user = \App\Models\User::withTrashed()->findOrFail($id);
        
        $user->restore();
        
        $user->update([
            'status' => 'Active',
            'last_updated_by' => auth()->user()->username ?? 'Sistema'
        ]);

        return redirect()->back()->with('success', 'Funcionário reativado com sucesso!');
    }
}