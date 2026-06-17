<?php

namespace App\Services;

use App\Models\WorkOrder;
use App\Models\Equipment;

class WorkOrderService
{
    public function getAllWorkOrders()
    {
        // Traz as OS ordenadas pelas mais recentes, incluindo os dados do equipamento 
        // e as atividades (junto com quem fez a atividade)
        return WorkOrder::with(['equipment.vessel', 'activities.responsibleUser'])
                        ->orderBy('created_at', 'desc')
                        ->get();
    }

    public function getWorkOrderById(string $id)
    {
        return WorkOrder::with(['equipment.vessel', 'activities.responsibleUser'])->findOrFail($id);
    }

    public function createWorkOrder(array $data)
    {
        // 1. Busca o equipamento para fazer o "Snapshot" histórico
        $equipment = Equipment::findOrFail($data['equipment_id']);

        // 2. Preenche os campos automáticos baseados no equipamento no momento da criação
        $data['tag_number'] = $equipment->tag_number;
        $data['series_number_id'] = $equipment->series_number;
        $data['model'] = $equipment->model;
        $data['manufacturer'] = $equipment->manufacturer;

        // Se o status já vier como concluído na criação, preenche a data
        if ($data['status'] === 'completed' && !isset($data['completed_at'])) {
            $data['completed_at'] = now();
        }

        return WorkOrder::create($data);
    }

    public function updateWorkOrder(string $id, array $data)
    {
        $workOrder = WorkOrder::findOrFail($id);

        // Regra de negócio: Se o usuário mudar o status para 'completed', setamos a data atual automaticamente.
        // Se mudar de 'completed' de volta para 'in_progress', limpamos a data de conclusão.
        if (isset($data['status'])) {
            if ($data['status'] === 'completed' && is_null($workOrder->completed_at)) {
                $data['completed_at'] = now();
            } elseif ($data['status'] !== 'completed') {
                $data['completed_at'] = null;
            }
        }

        $workOrder->update($data);

        return $workOrder;
    }

    public function deleteWorkOrder(string $id)
    {
        $workOrder = WorkOrder::findOrFail($id);
        
        // Opcional: Aqui você poderia bloquear a exclusão se a OS já estiver concluída
        // if ($workOrder->status === 'completed') {
        //     throw new \Exception("Cannot delete a completed work order.");
        // }

        return $workOrder->delete();
    }
}