<?php

namespace App\Http\Controllers;

use App\Services\VesselService;
use App\Models\Equipment;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class VesselController extends Controller
{
    protected $vesselService;

    // Injeção de dependência do Service
    public function __construct(VesselService $vesselService)
    {
        $this->vesselService = $vesselService;
    }

    /**
     * Retorna a página inicial com a lista de todos os navios (Index.jsx)
     */
    public function index()
    {
        $vessels = $this->vesselService->getAllVessels();

        // Mapeando para camelCase para não quebrar o seu código React atual
        $formattedVessels = $vessels->map(function ($vessel) {
            return [
                'id' => $vessel->id,
                'name' => $vessel->name,
                'tag' => $vessel->tag,
                'type' => $vessel->type ?? $vessel->class, 
                'status' => $vessel->status,
                'healthScore' => $vessel->health_score,
                'activeWOs' => $vessel->active_wos,
                'pendingSRs' => $vessel->pending_srs,
                'lastInspection' => $vessel->last_inspection ? $vessel->last_inspection->format('d/m/Y') : null,
                'modelPath' => $vessel->model_path,
                'dimensions' => $vessel->dimensions,
                'builder' => $vessel->builder,
                'year' => $vessel->year
            ];
        });

        return Inertia::render('Vessels/Index', [
            'vessels' => $formattedVessels,
        ]);

        
    }

    /**
     * Exibe os detalhes de uma embarcação específica
     */
    public function show($id)
    {
        $vessel = $this->vesselService->getVesselById($id);
        $equipments = Equipment::with('vessel')->orderBy('name')->get();
        $users = User::orderBy('username')->get(['id', 'username', 'nickname']);
        
        // Mapeando para camelCase exatamente como fizemos no index()
        $formattedVessel = [
            'id' => $vessel->id,
            'name' => $vessel->name,
            'tag' => $vessel->tag,
            'type' => $vessel->type ?? $vessel->class, 
            'status' => $vessel->status,                                    // Ex: "Operacional" ou "Com Problema"
            'navigationStatus' => $vessel->navigation_status ?? 'Atracada', // Ex: "Navegando" ou "Atracada"
            'healthScore' => $vessel->health_score,
            'activeWOs' => $vessel->active_wos,
            'pendingSRs' => $vessel->pending_srs,
            'lastInspection' => $vessel->last_inspection ? $vessel->last_inspection->format('d/m/Y') : 'N/A',
            'modelPath' => $vessel->model_path,
            
            // Garantindo que dimensions seja um array válido mesmo se vier nulo do banco
            'dimensions' => $vessel->dimensions ?? ['length' => 'N/A', 'beam' => 'N/A', 'draft' => 'N/A'],
            
            'builder' => $vessel->builder ?? 'Não informado',
            'year' => $vessel->year ?? 'Não informado',

            'crewCapacity' => $vessel->crew_capacity ?? 'Não informado',
            'equipmentsCount' => $vessel->equipments_count ?? 0,
        ];

        return Inertia::render('Vessels/VesselDetails', [ 
            'vessel'     => $formattedVessel,
            'equipments' => $equipments, 
            'users'      => $users    
        ]);
    }

    /**
     * Salva uma nova embarcação no banco (Vem do Modal que criamos)
     */
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'tag' => 'required|string|max:50',
            'type' => 'required|string|max:100',
            // Adicione outras validações conforme a necessidade do seu form
        ]);

        // Valores padrão caso não sejam enviados pelo formulário ainda
        $validatedData['status'] = 'Operacional';
        $validatedData['health_score'] = 100;
        $validatedData['active_wos'] = 0;
        $validatedData['pending_srs'] = 0;

        $this->vesselService->createVessel($validatedData);

        // Retorna para a mesma página com uma mensagem de sucesso na sessão (opcional)
        return redirect()->back()->with('success', 'Embarcação cadastrada com sucesso!');
    }

    /**
     * Atualiza os dados de uma embarcação existente
     */
    public function update(Request $request, $id)
    {
        // Validação rigorosa dos campos enviados pelo EditVesselModal
        $validatedData = $request->validate([
            'name'              => 'required|string|max:255',
            'tag'               => 'required|string|max:50',
            'type'              => 'required|string|max:100',
            'builder'           => 'nullable|string|max:255',
            'year'              => 'nullable|integer|min:1900|max:' . (date('Y') + 5),
            'crew_capacity'     => 'nullable|integer|min:0',
            
            // Garante que só aceita os status definidos no frontend
            'status' => 'required|string|max:100',
            'navigation_status' => 'required|string|in:Atracada,Navegando,Ancorada',
        ]);

        // Envia os dados validados para o Service fazer o update
        $this->vesselService->updateVessel($id, $validatedData);

        // O Inertia intercepta o redirect()->back() e atualiza os dados da página na hora
        return redirect()->back()->with('success', 'Embarcação atualizada com sucesso!');
    }

    /**
     * Remove uma embarcação
     */
    public function destroy($id)
    {
        $this->vesselService->deleteVessel($id);

        return redirect()->route('vessels.index')->with('success', 'Embarcação removida!');
    }
}