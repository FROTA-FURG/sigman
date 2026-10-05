<?php

namespace App\Http\Controllers;

use App\Models\CruiseLeg;
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
            'cruisePlans' => CruiseLeg::periodosPorEmbarcacao(),
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
            'started_at'       => 'nullable|date',
            'completed_at'     => 'nullable|date',
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

        // OS gerada de outra tela (ex.: Análise de Óleo) volta pra ela em vez
        // de cair na listagem -- o usuário segue no contexto em que estava.
        if ($request->boolean('voltar')) {
            return back()->with('success', 'Ordem de Serviço criada com sucesso.');
        }

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
            'workOrder' => $workOrder,
            'equipments' => Equipment::with('vessel')->orderBy('name')->get(),
            // EditWorkOrderModal lê terceiros das props da página (não é
            // parâmetro do componente) -- precisa estar aqui pra funcionar
            // igual já funciona a partir da listagem de OS.
            'thirdParties' => ThirdParty::orderBy('razao_social')->get(['id', 'razao_social', 'cnpj']),
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
            'started_at'       => 'nullable|date',
        ]);

        // A observação do engenheiro é dele: estagiário e marinheiro abrem o
        // mesmo modal (podem editar outros campos da OS da sua embarcação),
        // então o campo é descartado se quem enviou não for da gestão.
        if (array_key_exists('engineer_comment', $validatedData) && ! $this->canComment($request->user())) {
            unset($validatedData['engineer_comment']);
        }

        // Engenheiro/TI mudam status de qualquer OS; estagiário só na OS da
        // própria embarcação. A trava no formulário é só interface; esta
        // aqui é a que vale.
        if (array_key_exists('status', $validatedData)) {
            $equipment = Equipment::find($validatedData['equipment_id'] ?? null);
            if (! $this->canChangeStatus($request->user(), $equipment?->vessel_id)) {
                unset($validatedData['status']);
            }
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

    /**
     * TI/engenheiro mudam status de qualquer OS. Estagiário também pode,
     * mas só na OS da própria embarcação -- fora dela, continua só
     * aprovando (intern_status) pelo Planejamento.
     */
    private function canChangeStatus(?User $user, ?string $vesselId = null): bool
    {
        $roleName = $user?->role->name ?? null;

        if (in_array($roleName, ['dev', 'engineer'], true)) {
            return true;
        }

        return $roleName === 'intern' && $vesselId !== null && $user->coversVessel($vesselId);
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
            'modo' => 'required|in:periodicidade,nova_data,sem_reagendamento',
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

        if ($resultado['nova']) {
            $mensagem = "OS {$resultado['antiga']->os_number} inativada. Reprogramada para {$resultado['nova']->os_number}, em "
                . $resultado['nova']->created_at->format('d/m/Y') . '.';

            if ($resultado['reancoradas'] > 0) {
                $mensagem .= " {$resultado['reancoradas']} ocorrência(s) futura(s) da mesma tarefa foram reancoradas a partir da nova data.";
            }
        } else {
            $mensagem = "OS {$resultado['antiga']->os_number} inativada, sem reprogramação.";
        }

        return back()->with('success', $mensagem);
    }

    public function updateStatus(Request $request, $id)
    {
        $os = WorkOrder::with('equipment.vessel')->findOrFail($id);

        if (! $this->canChangeStatus($request->user(), $os->equipment?->vessel_id)) {
            abort(403, 'Só engenheiro, TI ou estagiário da própria embarcação mudam o status da OS.');
        }

        $request->validate([
            'status' => 'required|string|in:open,in_progress,scheduled,completed,cancelled'
        ]);

        $updateData = ['status' => $request->status];

        // Primeira vez que entra em andamento, marca quando começou de verdade.
        if ($request->status === 'in_progress' && is_null($os->started_at)) {
            $updateData['started_at'] = now();
        }

        // Mesma regra de WorkOrderService::updateWorkOrder() -- esse endpoint
        // é um caminho à parte (o seletor rápido de status), então precisa
        // da própria cópia da lógica pra também preencher a Data Fim sozinho.
        if ($request->status === 'completed' && is_null($os->completed_at)) {
            $updateData['completed_at'] = now();
        }

        $os->update($updateData);

        // Disparar (ou agendar) é a validação final do engenheiro. Registra quem aprovou
        // e avisa os estagiários daquela embarcação no sino do perfil.
        $user = $request->user();

        if (in_array($request->status, ['open', 'in_progress', 'scheduled'], true) && ! $this->isIntern($user)) {
            $this->dispatchNotifier->notifyInternsOfApproval($os, $user);
        }

        // OS que entra em vigor (aberta/andamento e com a data já válida) avisa
        // os responsáveis por e-mail e pelo sino do perfil.
        $notified = $this->dispatchNotifier->notifyIfDispatched($os);

        // Preventiva do plano concluída gera a próxima ocorrência sozinha,
        // a partir de quando foi concluída de verdade (ver
        // WorkOrderService::regenerateIfPreventiveCompleted).
        $proxima = null;
        if ($request->status === 'completed') {
            $proxima = $this->workOrderService->regenerateIfPreventiveCompleted($os->fresh());
        }

        $mensagem = $notified
            ? "OS {$os->os_number} disparada. Responsáveis notificados por e-mail."
            : "Status da OS {$os->os_number} atualizado.";

        if ($proxima) {
            $mensagem .= " Próxima ocorrência gerada automaticamente: OS {$proxima->os_number}, em {$proxima->created_at->format('d/m/Y')}.";
        }

        return back()->with('success', $mensagem);
    }
}