<?php

namespace App\Http\Controllers;

use App\Models\ServiceRequest;
use App\Models\Vessel;
use App\Models\Equipment;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ServiceRequestController extends Controller
{
    public function index()
    {
        $serviceRequests = ServiceRequest::with(['vessel', 'equipment', 'responsibleUser'])
            ->latest()
            ->get();

        $vessels = Vessel::orderBy('name')->get();
        $equipments = Equipment::orderBy('name')->get();
        $users = User::orderBy('username')->get(['id', 'username', 'nickname']);

        return Inertia::render('ServiceRequests/Index', [
            'serviceRequests' => $serviceRequests,
            'vessels'         => $vessels,
            'equipments'      => $equipments,
            'users'           => $users
        ]);
    }

    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'vessel_id'           => 'required|uuid|exists:vessels,id',
            'equipment_id'        => 'nullable|uuid|exists:equipment,id',
            'tag_number'          => 'nullable|string|max:255',
            'description'         => 'required|string',
            'requester_name'      => 'nullable|string|max:255',
            'desired_date'        => 'nullable|date',
            'maintenance_type'    => 'required|in:corrective,preventive,predictive',
            'priority'            => 'required|in:low,normal,high,urgent',
            'status'              => 'required|string',
        ]);

        // Descobre a tag da embarcação
        $vessel = Vessel::findOrFail($validatedData['vessel_id']);
        $vesselCode = $vessel->tag ?? 'ERR';

        // Busca a última SS gerada
        $lastRequest = ServiceRequest::where('ss_number', 'like', $vesselCode . '%')
            ->orderBy('ss_number', 'desc')
            ->first();

        // Calcula o próximo número
        if ($lastRequest && !empty($lastRequest->ss_number)) {
            $lastNumber = intval(str_replace($vesselCode, '', $lastRequest->ss_number));
            $nextNumber = $lastNumber + 1;
        } else {
            $nextNumber = 1;
        }

        $validatedData['ss_number'] = $vesselCode . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);

        ServiceRequest::create($validatedData);

        return redirect()->back()->with('success', 'Solicitação de Serviço criada com sucesso!');
    }

    public function update(Request $request, $id)
    {
        $validatedData = $request->validate([
            'vessel_id'           => 'required|uuid|exists:vessels,id',
            'equipment_id'        => 'nullable|uuid|exists:equipment,id',
            'tag_number'          => 'nullable|string|max:255',
            'description'         => 'required|string',
            'maintenance_type'    => 'required|in:corrective,preventive,predictive',
            'priority'            => 'required|in:low,normal,high,urgent',
            'status'              => 'required|in:pending,approved,rejected',
            'budget'              => 'nullable|numeric|min:0', 
            'requester_name'      => 'nullable|string|max:255',
            'desired_date'        => 'nullable|date',
            'vendor_cnpj'         => 'nullable|string|max:18',
            'vendor_name'         => 'nullable|string|max:255',
        ]);

        $serviceRequest = ServiceRequest::findOrFail($id);
        $serviceRequest->update($validatedData);

        return redirect()->back()->with('success', 'Solicitação de Serviço atualizada!');
    }

    public function destroy($id)
    {
        $serviceRequest = ServiceRequest::findOrFail($id);
        $serviceRequest->delete();

        return redirect()->back()->with('success', 'Solicitação de Serviço excluída!');
    }
}