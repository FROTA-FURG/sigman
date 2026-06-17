<?php

namespace App\Http\Controllers;

use App\Models\DryDocking;
use App\Models\Vessel;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;

class DryDockingController extends Controller
{
    public function index()
    {
        // Busca todas as docagens e traz a embarcação junto
        $dryDockings = DryDocking::with('vessel')->orderBy('planned_start_date', 'asc')->get();
        $vessels = Vessel::orderBy('name')->get(['id', 'name', 'tag']); 
        
        return Inertia::render('DryDockings/Index', [
            'dryDockings' => $dryDockings,
            'vessels' => $vessels  
        ]);
    }

    public function show($id)
    {
        // Busca a docagem específica pelo ID e já traz os dados do navio junto
        if (!Str::isUuid($id)) {
            return Inertia::render('DryDockings/Show', [
                'dryDocking' => null // Envia nulo para o React usar os Mocks internos
            ]);
        }

        // Se for um UUID de verdade (quando você criar dados reais), busca no banco
        $dryDocking = DryDocking::with('vessel')->findOrFail($id);

        return Inertia::render('DryDockings/Show', [
            'dryDocking' => $dryDocking
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'vessel_id'          => 'required|uuid|exists:vessels,id',
            'shipyard'           => 'nullable|string|max:255',
            'planned_start_date' => 'required|date',
            'planned_end_date'   => 'required|date|after_or_equal:planned_start_date',
            'budget'             => 'nullable|numeric|min:0',
            'status'             => 'required|in:planning,quoting,in_progress,completed,cancelled',
            'notes'              => 'nullable|string',
        ]);

        DryDocking::create($validated);

        return redirect()->back()->with('success', 'Planejamento de docagem registrado!');
    }
}
