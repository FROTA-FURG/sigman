<?php

namespace App\Services;

use App\Models\ServiceRequest;  
use App\Models\Equipment;

class ServiceRequestService
{
    public function getAllServiceRequests()
    {
        return ServiceRequest::with(['equipment', 'responsibleUser'])
                             ->orderBy('created_at', 'desc')
                             ->get();
    }

    public function getServiceRequestById(string $id)
    {
        return ServiceRequest::with(['equipment', 'responsibleUser'])->findOrFail($id);
    }

    public function createServiceRequest(array $data)
    {
        // Se o usuário mandou o equipamento, fazemos o snapshot da TAG
        if (isset($data['equipment_id'])) {
            $equipment = Equipment::findOrFail($data['equipment_id']);
            $data['tag_number'] = $equipment->tag_number;
        }

        return ServiceRequest::create($data);
    }

    public function updateServiceRequest(string $id, array $data)
    {
        $serviceRequest = ServiceRequest::findOrFail($id);
        $serviceRequest->update($data);

        return $serviceRequest;
    }

    public function deleteServiceRequest(string $id)
    {
        $serviceRequest = ServiceRequest::findOrFail($id);
        return $serviceRequest->delete();
    }
}