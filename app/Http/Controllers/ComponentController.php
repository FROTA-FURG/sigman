<?php

namespace App\Http\Controllers;

use App\Models\Component;
use Illuminate\Http\Request;

/**
 * Nível opcional abaixo do equipamento (ver migration create_component_table
 * pro significado dos 3 tipos). Não tem tela própria: vive dentro da
 * página de detalhe do equipamento (Equipment/Show.jsx).
 */
class ComponentController extends Controller
{
    private const TIPOS = ['sobressalente_rotativo', 'sobressalente_consumivel', 'item_critico'];

    public function store(Request $request)
    {
        $validated = $request->validate([
            'equipment_id' => 'required|uuid|exists:equipment,id',
            'name' => 'required|string|max:255',
            'tag_number' => 'nullable|string|max:255',
            'tipo' => 'required|in:' . implode(',', self::TIPOS),
            'manufacturer' => 'nullable|string|max:255',
            'model' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:2000',
        ]);

        Component::create($validated);

        return back()->with('success', 'Componente adicionado.');
    }

    public function update(Request $request, string $id)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'tag_number' => 'nullable|string|max:255',
            'tipo' => 'required|in:' . implode(',', self::TIPOS),
            'manufacturer' => 'nullable|string|max:255',
            'model' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:2000',
        ]);

        Component::findOrFail($id)->update($validated);

        return back()->with('success', 'Componente atualizado.');
    }

    public function destroy(string $id)
    {
        Component::findOrFail($id)->delete();

        return back()->with('success', 'Componente removido.');
    }
}
