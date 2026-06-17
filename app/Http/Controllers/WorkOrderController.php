<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Equipment;
use App\Models\WorkOrder;
use App\Services\WorkOrderService;
use Illuminate\Http\Request;
use Inertia\Inertia;    

class WorkOrderController extends Controller
{
    protected $workOrderService;

    public function __construct(WorkOrderService $workOrderService)
    {
        $this->workOrderService = $workOrderService;
    }
    
    public function index()
    {
        $workOrders = $this->workOrderService->getAllWorkOrders();

        $equipments = Equipment::with('vessel')->orderBy('name')->get();

        $users = User::orderBy('username')->get(['id', 'username', 'nickname']);

        return Inertia::render('WorkOrders/Index', [
            'workOrders' => $workOrders,
            'equipments' => $equipments,
            'users' => $users
        ]);
    }

    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'equipment_id'     => 'required|uuid|exists:equipment,id',
            'ss_number'        => 'nullable|string|max:255',
            'description'      => 'required|string',
            'maintenance_type' => 'required|in:corrective,preventive,predictive',
            'priority'         => 'required|in:low,medium,high,critical',
            'status'           => 'required|in:open,in_progress,completed,cancelled',
            'periodicity'      => 'required|string|max:50',
            'vendor_name'      => 'nullable|string|max:255',
            'estimated_hours' => 'nullable|numeric|min:0',
            'created_at'       => 'required|date',
        ]);
        
        $equipment = Equipment::with('vessel')->findOrFail($validatedData['equipment_id']);
        $vesselCode = $equipment->vessel->tag; // Ex: 'AS' ou 'CM1'

        if (empty($vesselCode)) {
            $vesselCode = 'ERR'; // Coloca ERR para você bater o olho e saber que o cadastro do navio está incompleto
        }

        // Busca a última OS gerada desta embarcação
        $lastWorkOrder = WorkOrder::where('os_number', 'like', $vesselCode . '%')
            ->orderBy('os_number', 'desc')
            ->first();

        // Calculo do próximo número 
        if ($lastWorkOrder) {
            // Extrai só os números (tira o 'AS' e pega o '0001'), converte pra int e soma 1
            $lastNumber = intval(str_replace($vesselCode, '', $lastWorkOrder->os_number));
            $nextNumber = $lastNumber + 1;
        } else {
            // Se for a primeira OS do navio
            $nextNumber = 1;
        }

        // Formata com zeros à esquerda (ex: AS0001, AS0042, AS1050)
        $validatedData['os_number'] = $vesselCode . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);

        $this->workOrderService->createWorkOrder($validatedData);

        return redirect()->route('work-orders.index')
            ->with('success', 'Ordem de Serviço criada com sucesso.');
    }

    public function show(string $id) // ID é string por causa do UUID
    {
        $workOrder = $this->workOrderService->getWorkOrderById($id);

        return Inertia::render('WorkOrders/Show', [
            'workOrder' => $workOrder
        ]);
    }

    public function update(Request $request, string $id)
    {
        $validatedData = $request->validate([
            'equipment_id'     => 'required|uuid|exists:equipment,id',
            'description'      => 'sometimes|string',
            'maintenance_type' => 'sometimes|in:corrective,preventive,predictive',
            'priority'         => 'sometimes|in:low,medium,high,critical',
            'status'           => 'sometimes|in:open,in_progress,completed,cancelled',
            'periodicity'      => 'required|string|max:50',
            'vendor_name'      => 'nullable|string|max:255',
            'estimated_hours' => 'nullable|numeric|min:0',
            'created_at'       => 'required|date',
            'completed_at'     => 'nullable|date',
        ]);

        $this->workOrderService->updateWorkOrder($id, $validatedData);

        return redirect()->back()->with('success', 'Work Order updated successfully.');
    }

    public function destroy(string $id)
    {
        $this->workOrderService->deleteWorkOrder($id);

        return redirect()->route('work-orders.index')
            ->with('success', 'Work Order deleted successfully.');
    }

    public function getAllWorkOrders()
    {
        // Traz a OS + Equipamento + Navio + Atividades + Quem fez a atividade + se existir uma SS vinculada
        return WorkOrder::with(['equipment.vessel', 'activities.responsibleUser', 'serviceRequest'])
                        ->orderBy('created_at', 'desc')
                        ->get();
    }
}