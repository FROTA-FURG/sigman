<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Equipment;
use App\Models\ThirdParty;
use App\Models\WorkOrder;
use App\Services\WorkOrderDispatchNotifier;
use App\Services\WorkOrderService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WorkOrderController extends Controller
{
    protected $workOrderService;
    protected $dispatchNotifier;

    public function __construct(WorkOrderService $workOrderService, WorkOrderDispatchNotifier $dispatchNotifier)
    {
        $this->workOrderService = $workOrderService;
        $this->dispatchNotifier = $dispatchNotifier;
    }
    
    public function index(Request $request)
    {
        // O terceiro só enxerga as OS da própria empresa; os demais veem todas.
        $thirdPartyId = $this->isThirdParty($request->user()) ? $request->user()->third_party_id : null;

        $workOrders = $this->workOrderService->getAllWorkOrders($thirdPartyId);

        $equipments = Equipment::with('vessel')->orderBy('name')->get();

        $users = User::orderBy('username')->get(['id', 'username', 'nickname']);

        $thirdParties = ThirdParty::orderBy('razao_social')->get(['id', 'razao_social', 'cnpj']);

        return Inertia::render('WorkOrders/Index', [
            'workOrders' => $workOrders,
            'equipments' => $equipments,
            'users' => $users,
            'thirdParties' => $thirdParties,
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
            'periodicity'      => 'nullable|string|max:50',
            'in_52_week_plan'  => 'boolean',
            'vendor_name'      => 'nullable|string|max:255',
            'third_party_id'   => 'nullable|uuid|exists:third_parties,id',
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

    public function show(Request $request, string $id) // ID é string por causa do UUID
    {
        $workOrder = $this->workOrderService->getWorkOrderById($id);

        // Terceiro só pode abrir OS da própria empresa.
        if ($this->isThirdParty($request->user()) && $workOrder->third_party_id !== $request->user()->third_party_id) {
            abort(403, 'Esta OS não pertence à sua empresa.');
        }

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
            'periodicity'      => 'nullable|string|max:50',
            'in_52_week_plan'  => 'boolean',
            'vendor_name'      => 'nullable|string|max:255',
            'third_party_id'   => 'nullable|uuid|exists:third_parties,id',
            'estimated_hours' => 'nullable|numeric|min:0',
            'engineer_comment' => 'nullable|string|max:5000',
            'created_at'       => 'required|date',
            'completed_at'     => 'nullable|date',
        ]);

        // A observação do engenheiro é dele: estagiário e marinheiro abrem o
        // mesmo modal (podem editar outros campos da OS da sua embarcação),
        // então o campo é descartado se quem enviou não for da gestão.
        if (array_key_exists('engineer_comment', $validatedData) && ! $this->canComment($request->user())) {
            unset($validatedData['engineer_comment']);
        }

        $this->workOrderService->updateWorkOrder($id, $validatedData, $request->user());

        return redirect()->back()->with('success', 'Work Order updated successfully.');
    }

    public function destroy(string $id)
    {
        $this->workOrderService->deleteWorkOrder($id);

        return redirect()->route('work-orders.index')
            ->with('success', 'Work Order deleted successfully.');
    }

    /**
     * O estagiário avalia a OS, mas não é ele quem a aprova: a validação final é do engenheiro.
     */
    private function isIntern(?User $user): bool
    {
        return ($user?->role->name ?? null) === 'intern';
    }

    private function isThirdParty(?User $user): bool
    {
        return ($user?->role->name ?? null) === 'terceiro';
    }

    /** Quem pode deixar a observação do engenheiro na OS. */
    private function canComment(?User $user): bool
    {
        return in_array($user?->role->name ?? null, ['dev', 'coordinator', 'engineer'], true);
    }

    /** Quem pode inativar/reprogramar uma OS do plano -- decisão de planejamento, não de execução. */
    private function canInactivate(?User $user): bool
    {
        return in_array($user?->role->name ?? null, ['dev', 'coordinator', 'engineer'], true);
    }

    public function getAllWorkOrders()
    {
        // Traz a OS + Equipamento + Navio + Atividades + Quem fez a atividade + se existir uma SS vinculada
        return WorkOrder::with(['equipment.vessel', 'activities.responsibleUser', 'serviceRequest'])
                        ->orderBy('created_at', 'desc')
                        ->get();
    }

    public function updateInternStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'intern_status' => 'required|in:pending,approved,waiting',
            'intern_reason' => 'nullable|string|max:2000',
        ]);

        $os = WorkOrder::findOrFail($id);

        $reason = trim((string) ($validated['intern_reason'] ?? ''));

        $os->update([
            'intern_status' => $validated['intern_status'],
            'intern_reason' => $reason === '' ? null : $reason,
            // Vem de quem está logado, não do corpo do request: antes o nome
            // era enviado pelo front e dava para assinar a validação com o
            // nome de outra pessoa.
            'intern_name'   => $request->user()?->nickname ?: $request->user()?->username,
        ]);

        return back();
    }

    /**
     * A ocorrência marcada não vai acontecer: inativa a OS e cria a
     * próxima, conforme a periodicidade ou numa nova data escolhida pelo
     * engenheiro (que também reancora as ocorrências futuras da mesma
     * tarefa -- ver WorkOrderService::inactivateWorkOrder).
     */
    public function inactivate(Request $request, string $id)
    {
        if (! $this->canInactivate($request->user())) {
            abort(403, 'Só dev, coordenador ou engenheiro podem inativar/reprogramar uma OS.');
        }

        $validated = $request->validate([
            'modo' => 'required|in:periodicidade,nova_data',
            'nova_data' => 'required_if:modo,nova_data|nullable|date',
            'motivo' => 'nullable|string|max:2000',
        ]);

        $resultado = $this->workOrderService->inactivateWorkOrder(
            $id,
            $validated['modo'],
            $request->user(),
            $validated['nova_data'] ?? null,
            $validated['motivo'] ?? null,
        );

        $mensagem = "OS {$resultado['antiga']->os_number} inativada. Reprogramada para {$resultado['nova']->os_number}, em "
            . $resultado['nova']->created_at->format('d/m/Y') . '.';

        if ($resultado['reancoradas'] > 0) {
            $mensagem .= " {$resultado['reancoradas']} ocorrência(s) futura(s) da mesma tarefa foram reancoradas a partir da nova data.";
        }

        return back()->with('success', $mensagem);
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|string|in:open,in_progress,scheduled,completed,cancelled'
        ]);

        $os = WorkOrder::with('equipment.vessel')->findOrFail($id);

        $os->update([
            'status' => $request->status
        ]);

        // Disparar (ou agendar) é a validação final do engenheiro. Registra quem aprovou
        // e avisa os estagiários daquela embarcação no sino do perfil.
        $user = $request->user();

        if (in_array($request->status, ['open', 'in_progress', 'scheduled'], true) && ! $this->isIntern($user)) {
            $this->dispatchNotifier->notifyInternsOfApproval($os, $user);
        }

        // OS que entra em vigor (aberta/andamento e com a data já válida) avisa
        // os responsáveis por e-mail e pelo sino do perfil.
        $notified = $this->dispatchNotifier->notifyIfDispatched($os);

        return back()->with(
            'success',
            $notified
                ? "OS {$os->os_number} disparada. Responsáveis notificados por e-mail."
                : "Status da OS {$os->os_number} atualizado."
        );
    }
}