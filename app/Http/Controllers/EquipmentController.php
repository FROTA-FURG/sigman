<?php

namespace App\Http\Controllers;

use App\Models\Vessel;
use App\Models\Equipment;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EquipmentController extends Controller
{
    public function index()
    {
        // Busca todas as embarcações e seus equipamentos "raiz" (que não têm pai)
        $vessels = Vessel::with(['equipments' => function ($query) {
            $query->whereNull('parent_id')->with('children');
        }])->orderBy('name')->get();

        // Monta a estrutura em árvore exata que o React espera
        $treeData = $vessels->map(function ($vessel) {
            return [
                'id' => $vessel->id,
                'type' => 'vessel',
                'name' => $vessel->name,
                'status' => $vessel->status ?? 'Operacional',
                'children' => $this->formatEquipmentTree($vessel->equipments)
            ];
        });

        return Inertia::render('Equipment/Index', [
            'equipmentTree' => $treeData
        ]);
    }

    // Função recursiva para montar os níveis internos (sistemas, equipamentos, componentes)
    private function formatEquipmentTree($equipments)
    {
        return $equipments->map(function ($equipment) {
            $type = $equipment->children->count() > 0 ? 'system' : 'equipment';

            return [
                'id' => $equipment->id,
                'type' => $type,
                'name' => $equipment->name,
                'tag' => $equipment->tag_number,
                'manufacturer' => $equipment->manufacturer,
                'model' => $equipment->model,
                'series_number' => $equipment->series_number,
                'criticality' => $equipment->criticality ?? 'A',
                'status' => $equipment->status ?? 'Operacional',
                'children' => $this->formatEquipmentTree($equipment->children)
            ];
        });
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'parent_id'    => 'required|uuid',
            'parent_type'  => 'required|string',
            'name'         => 'required|string|max:255',
            'tag'          => 'required|string|max:255',
            'series_number'=> 'nullable|string|max:255',
            'status'       => 'required|string',
            'manufacturer' => 'nullable|string|max:255',
            'model'        => 'nullable|string|max:255',
            'criticality'  => 'nullable|string|max:255',
        ]);

        $vesselId = null;
        $parentId = null;

        // Lógica para descobrir onde pendurar o equipamento
        if ($validated['parent_type'] === 'vessel') {
            // Se ele clicou direto no navio, o navio é o dono e não tem "pai equipamento"
            $vesselId = $validated['parent_id'];
        } else {
            $parentEquipment = Equipment::findOrFail($validated['parent_id']);
            $vesselId = $parentEquipment->vessel_id;
            $parentId = $parentEquipment->id;
        }

        Equipment::create([
            'vessel_id'    => $vesselId,
            'parent_id'    => $parentId,
            'name'         => $validated['name'],
            'status'       => $validated['status'],
            'tag_number'   => $validated['tag'],
            'series_number'=> $validated['series_number'] ?? null,
            'manufacturer' => $validated['manufacturer'] ?? null,
            'model'        => $validated['model'] ?? null,
            'criticality'  => $validated['criticality'] ?? null,
        ]);

        return redirect()->back()->with('success', 'Item adicionado à árvore com sucesso!');
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'name'         => 'required|string|max:255',
            'tag'          => 'required|string|max:255',
            'status'       => 'required|string',
            'series_number'=> 'nullable|string|max:255',
            'manufacturer' => 'nullable|string|max:255',
            'model'        => 'nullable|string|max:255',
            'criticality'  => 'nullable|string|max:255', 
        ]);

        $equipment = Equipment::findOrFail($id);

        $equipment->update([
            'name'         => $validated['name'],
            'tag_number'   => $validated['tag'],
            'status'       => $validated['status'],
            'series_number'=> $validated['series_number'] ?? null,
            'manufacturer' => $validated['manufacturer'] ?? null,
            'model'        => $validated['model'] ?? null,
            'criticality'  => $validated['criticality'] ?? null,
        ]);

        return redirect()->back()->with('success', 'Informações atualizadas com sucesso!');
    }

    public function destroy($id)
    {
        $equipment = Equipment::findOrFail($id);
        
        // Exclui todos os filhos atrelados a este equipamento antes de excluí-lo
        $equipment->children()->delete();
        
        // Exclui o item principal
        $equipment->delete();

        return redirect()->back()->with('success', 'Item excluído com sucesso da árvore.');
    }
}