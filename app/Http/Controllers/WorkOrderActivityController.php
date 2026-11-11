<?php

namespace App\Http\Controllers;

use App\Models\WorkOrder;
use App\Models\WorkOrderActivity;
use Illuminate\Http\Request;

class WorkOrderActivityController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'work_order_id'       => 'required|uuid|exists:work_orders,id',
            'responsible_user_id' => 'nullable|uuid|exists:users,id',
            'responsible_name'    => 'nullable|string|max:120',
            'description'         => 'required|string',
            'started_at'          => 'required|date',
            'completed_at'        => 'nullable|date|after_or_equal:started_at',
        ]);

        // Terceiro só registra atividade em OS da própria empresa.
        $user = $request->user();
        if (($user->role->name ?? null) === 'terceiro') {
            $ownsWorkOrder = WorkOrder::where('id', $validated['work_order_id'])
                ->where('third_party_id', $user->third_party_id)
                ->exists();

            if (! $ownsWorkOrder) {
                abort(403, 'Esta OS não pertence à sua empresa.');
            }
        }

        WorkOrderActivity::create($this->comResponsavel($validated));

        return redirect()->back()->with('success', 'Atividade registrada com sucesso!');
    }

    public function update(Request $request, string $id)
    {
        $validated = $request->validate([
            'responsible_user_id' => 'nullable|uuid|exists:users,id',
            'responsible_name'    => 'nullable|string|max:120',
            'description'         => 'required|string',
            'started_at'          => 'required|date',
            'completed_at'        => 'nullable|date|after_or_equal:started_at',
        ]);
        $activity = WorkOrderActivity::findOrFail($id);
        $activity->update($this->comResponsavel($validated));

        return redirect()->back()->with('success', 'Atividade editada com sucesso!');
    }

    public function destroy(string $id)
    {
        $activity = WorkOrderActivity::findOrFail($id);
        
        $activity->delete();

        return redirect()->back()->with('success', 'Atividade excluída com sucesso!');
    }

    /**
     * O responsável é quem executou, não necessariamente quem lança: um
     * usuário do sistema OU um nome digitado (gente de fora, ex.: técnico do
     * fabricante). Nunca os dois. Sem nenhum, fica quem está lançando.
     */
    private function comResponsavel(array $dados): array
    {
        $nome = trim((string) ($dados['responsible_name'] ?? ''));

        if ($nome !== '') {
            $dados['responsible_name'] = $nome;
            $dados['responsible_user_id'] = null;
        } else {
            $dados['responsible_name'] = null;
            $dados['responsible_user_id'] = ($dados['responsible_user_id'] ?? null) ?: auth()->id();
        }

        return $dados;
    }
}
