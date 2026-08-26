<?php

namespace App\Http\Controllers;

use App\Models\ExecutionWindow;
use App\Models\ExecutionWindowWorkOrder;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

/**
 * "Janela de Execução": um lote de OS agrupado numa janela de datas
 * escolhida conforme a disponibilidade da embarcação (fora do plano de
 * cruzeiro). Vincular uma OS na janela não muda a data-alvo dela
 * (created_at) -- só a data de início real (started_at), que passa a
 * refletir quando a equipe realmente vai atacar aquele lote.
 */
class ExecutionWindowController extends Controller
{
    public function index()
    {
        $windows = ExecutionWindow::with(['vessel', 'creator', 'updater'])
            ->withCount(['activeMemberships as work_orders_count'])
            ->orderByDesc('start_date')
            ->get();

        return Inertia::render('WorkOrders/ExecutionWindows/Index', [
            'executionWindows' => $windows,
        ]);
    }

    public function show(string $id)
    {
        $window = ExecutionWindow::with(['vessel', 'creator', 'updater'])->findOrFail($id);

        $memberships = $window->memberships()
            ->with(['workOrder.equipment', 'addedByUser', 'removedByUser'])
            ->orderByDesc('added_at')
            ->get();

        $ativasIds = $memberships->whereNull('removed_at')->pluck('work_order_id');

        // Candidatas pra adicionar depois de criada: abertas/agendadas da
        // mesma embarcação, ainda não ativas nesta janela (a colisão com
        // outra janela é validada de verdade no update()).
        $candidateWorkOrders = WorkOrder::whereHas('equipment', fn ($q) => $q->where('vessel_id', $window->vessel_id))
            ->whereIn('status', ['open', 'scheduled'])
            ->whereNotIn('id', $ativasIds)
            ->orderBy('created_at')
            ->get();

        return Inertia::render('WorkOrders/ExecutionWindows/Show', [
            'executionWindow' => $window,
            'memberships' => $memberships,
            'candidateWorkOrders' => $candidateWorkOrders,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'vessel_id' => 'required|uuid|exists:vessels,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'work_order_ids' => 'array',
            'work_order_ids.*' => 'uuid|exists:work_orders,id',
        ]);

        $user = $request->user();

        [$window, $ignoradas] = DB::transaction(function () use ($validated, $user) {
            $window = ExecutionWindow::create([
                'vessel_id' => $validated['vessel_id'],
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'created_by' => $user->id,
            ]);

            $ignoradas = [];
            foreach ($validated['work_order_ids'] ?? [] as $osId) {
                if (! $this->attachWorkOrder($window, $osId, $user)) {
                    $ignoradas[] = $osId;
                }
            }

            return [$window, $ignoradas];
        });

        $mensagem = 'Janela de Execução criada com sucesso.';
        if (count($ignoradas) > 0) {
            $mensagem .= ' ' . count($ignoradas) . ' OS não foi(ram) incluída(s) por já estar(em) em outra janela que colide com esse período.';
        }

        return redirect()->route('execution-windows.show', $window->id)->with('success', $mensagem);
    }

    public function update(Request $request, string $id)
    {
        $window = ExecutionWindow::findOrFail($id);

        $validated = $request->validate([
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
            'add_work_order_ids' => 'array',
            'add_work_order_ids.*' => 'uuid|exists:work_orders,id',
            'remove_work_order_ids' => 'array',
            'remove_work_order_ids.*' => 'uuid|exists:work_orders,id',
        ]);

        $user = $request->user();

        $ignoradas = DB::transaction(function () use ($window, $validated, $user) {
            $window->update([
                'start_date' => $validated['start_date'] ?? $window->start_date,
                'end_date' => $validated['end_date'] ?? $window->end_date,
                'updated_by' => $user->id,
            ]);

            $ignoradas = [];
            foreach ($validated['add_work_order_ids'] ?? [] as $osId) {
                if (! $this->attachWorkOrder($window, $osId, $user)) {
                    $ignoradas[] = $osId;
                }
            }

            foreach ($validated['remove_work_order_ids'] ?? [] as $osId) {
                $window->activeMemberships()->where('work_order_id', $osId)->update([
                    'removed_at' => now(),
                    'removed_by' => $user->id,
                ]);
            }

            return $ignoradas;
        });

        $mensagem = 'Janela de Execução atualizada.';
        if (count($ignoradas) > 0) {
            $mensagem .= ' ' . count($ignoradas) . ' OS não foi(ram) incluída(s) por já estar(em) em outra janela que colide com esse período.';
        }

        return back()->with('success', $mensagem);
    }

    /** Apaga a janela e seus vínculos com OS (cascade). Não mexe no started_at das OS que estavam nela. */
    public function destroy(string $id)
    {
        $window = ExecutionWindow::findOrFail($id);
        $window->delete();

        return redirect()->route('execution-windows.index')->with('success', 'Janela de Execução excluída.');
    }

    /**
     * Vincula a OS na janela e ajusta a data de início real dela pro
     * começo da janela. Não vincula (retorna false) se a OS já está ativa
     * em outra janela cujo período colide com o desta -- ela pode
     * participar de janelas diferentes ao longo do tempo, só não de duas
     * que se sobrepõem em data.
     *
     * Se a OS já passou por esta mesma janela antes e foi removida,
     * "recolocar" reativa o mesmo vínculo (não cria um novo) -- assim ela
     * sai do histórico de remoções em vez de ficar lá pra sempre com um
     * vínculo ativo duplicado ao lado.
     */
    private function attachWorkOrder(ExecutionWindow $window, string $workOrderId, $user): bool
    {
        $membership = ExecutionWindowWorkOrder::where('execution_window_id', $window->id)
            ->where('work_order_id', $workOrderId)
            ->latest('id')
            ->first();

        if ($membership && is_null($membership->removed_at)) {
            return true;
        }

        $colideComOutraJanela = ExecutionWindowWorkOrder::where('work_order_id', $workOrderId)
            ->whereNull('removed_at')
            ->where('execution_window_id', '!=', $window->id)
            ->whereHas('executionWindow', function ($q) use ($window) {
                $q->where('start_date', '<=', $window->end_date)
                    ->where('end_date', '>=', $window->start_date);
            })
            ->exists();

        if ($colideComOutraJanela) {
            return false;
        }

        if ($membership) {
            $membership->update([
                'added_by' => $user->id,
                'added_at' => now(),
                'removed_by' => null,
                'removed_at' => null,
            ]);
        } else {
            ExecutionWindowWorkOrder::create([
                'execution_window_id' => $window->id,
                'work_order_id' => $workOrderId,
                'added_by' => $user->id,
                'added_at' => now(),
            ]);
        }

        WorkOrder::where('id', $workOrderId)->update(['started_at' => $window->start_date]);

        return true;
    }
}
