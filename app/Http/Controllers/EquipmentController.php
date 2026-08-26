<?php

namespace App\Http\Controllers;

use App\Models\Vessel;
use App\Models\Equipment;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class EquipmentController extends Controller
{
    /**
     * Página de detalhe de um equipamento: imagem, descrição, última
     * inspeção (a OS concluída mais recente), todas as OS vinculadas
     * (pra lista + calendário anual) e navegação na árvore (pai/filhos).
     */
    public function show(string $id)
    {
        $equipment = Equipment::with(['vessel', 'parent', 'children'])->findOrFail($id);

        $workOrders = WorkOrder::where('equipment_id', $equipment->id)
            ->orderBy('created_at', 'desc')
            ->get();

        // "Realizada" = pela data em que a OS foi de fato concluída
        // (completed_at), não pela data prevista (created_at) -- uma OS
        // atrasada e concluída depois ainda conta como a mais recente.
        $lastInspection = WorkOrder::where('equipment_id', $equipment->id)
            ->where('status', 'completed')
            ->orderByRaw('COALESCE(completed_at, created_at) DESC')
            ->first();

        return Inertia::render('Equipment/Show', [
            'equipment' => $equipment,
            'workOrders' => $workOrders,
            'lastInspection' => $lastInspection,
        ]);
    }

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
                'image_url' => $equipment->image_url,
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
            'description'  => 'nullable|string|max:5000',
            'image'        => 'nullable|image|mimes:jpg,jpeg,png,webp|max:4096',
            'remove_image' => 'boolean',
        ]);

        $equipment = Equipment::findOrFail($id);

        $data = [
            'name'         => $validated['name'],
            'tag_number'   => $validated['tag'],
            'status'       => $validated['status'],
            'series_number'=> $validated['series_number'] ?? null,
            'manufacturer' => $validated['manufacturer'] ?? null,
            'model'        => $validated['model'] ?? null,
            'criticality'  => $validated['criticality'] ?? null,
            'description'  => $validated['description'] ?? null,
        ];

        if ($request->hasFile('image')) {
            $data['image_url'] = $this->replaceEquipmentImage($equipment, $request->file('image'));
        } elseif ($request->boolean('remove_image')) {
            $this->deleteEquipmentImage($equipment);
            $data['image_url'] = null;
        }

        $equipment->update($data);

        return redirect()->back()->with('success', 'Informações atualizadas com sucesso!');
    }

    public function destroy($id)
    {
        $equipment = Equipment::findOrFail($id);

        // Exclui todos os filhos atrelados a este equipamento antes de excluí-lo
        foreach ($equipment->children as $child) {
            $this->deleteEquipmentImage($child);
        }
        $equipment->children()->delete();

        $this->deleteEquipmentImage($equipment);
        $equipment->delete();

        return redirect()->back()->with('success', 'Item excluído com sucesso da árvore.');
    }

    /** Salva a foto nova no disco público e apaga a anterior (se houver). Retorna o path relativo salvo. */
    private function replaceEquipmentImage(Equipment $equipment, $file): string
    {
        $this->deleteEquipmentImage($equipment);

        return $file->store('equipment', 'public');
    }

    private function deleteEquipmentImage(Equipment $equipment): void
    {
        if ($equipment->image_url) {
            Storage::disk('public')->delete($equipment->image_url);
        }
    }
}