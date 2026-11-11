<?php

namespace App\Http\Controllers;

use App\Models\CruiseLeg;
use App\Models\User;
use App\Models\Equipment;
use App\Models\ThirdParty;
use App\Models\WorkOrder;
use App\Models\WorkOrderEvent;
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

        // Só o que esse usuário pode ver (ver WorkOrderService::getAllWorkOrders).
        $workOrders = $this->workOrderService->getAllWorkOrders($thirdPartyId, $request->user());

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
            // Docagem deixou de ser periodicidade: agora é a flag is_docking.
            'periodicity'      => 'nullable|string|max:50|not_in:docking',
            'in_52_week_plan'  => 'boolean',
            'is_docking'       => 'boolean',
            'is_extra_activity' => 'boolean',
            'vendor_name'      => 'nullable|string|max:255',
            'third_party_id'   => 'nullable|uuid|exists:third_parties,id',
            'estimated_hours' => 'nullable|numeric|min:0',
            'created_at'       => 'required|date',
            'started_at'       => 'nullable|date',
            'completed_at'     => 'nullable|date',
        ]);

        $this->validarOrigem($validatedData);

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

        // Os demais: gestão vê qualquer OS; quem é de uma embarcação, só as dela.
        if (! $this->isThirdParty($request->user()) && ! $this->canView($request->user(), $workOrder->equipment?->vessel_id)) {
            abort(403, 'Esta OS é de uma embarcação que você não acompanha.');
        }

        return Inertia::render('WorkOrders/Show', [
            'workOrder' => $workOrder,
            'equipments' => Equipment::with('vessel')->orderBy('name')->get(),
            // EditWorkOrderModal lê terceiros das props da página (não é
            // parâmetro do componente) -- precisa estar aqui pra funcionar
            // igual já funciona a partir da listagem de OS.
            'thirdParties' => ThirdParty::orderBy('razao_social')->get(['id', 'razao_social', 'cnpj']),
            // Responsáveis para lançar atividade direto no modal da OS.
            'users' => User::orderBy('username')->get(['id', 'username', 'nickname']),
        ]);
    }

    public function update(Request $request, string $id)
    {
        $os = WorkOrder::with('equipment')->findOrFail($id);
        if (! $this->canEdit($request->user(), $os->equipment?->vessel_id)) {
            abort(403, 'Só dev, coordenador, engenheiro ou o estagiário da embarcação editam esta OS.');
        }

        $validatedData = $request->validate([
            'equipment_id'     => 'required|uuid|exists:equipment,id',
            'description'      => 'sometimes|string',
            'maintenance_type' => 'sometimes|in:corrective,preventive,predictive',
            'priority'         => 'sometimes|in:low,medium,high,critical',
            'status'           => 'sometimes|in:open,in_progress,scheduled,completed,cancelled',
            // Docagem deixou de ser periodicidade: agora é a flag is_docking.
            'periodicity'      => 'nullable|string|max:50|not_in:docking',
            'in_52_week_plan'  => 'boolean',
            'is_docking'       => 'boolean',
            'is_extra_activity' => 'boolean',
            'vendor_name'      => 'nullable|string|max:255',
            'third_party_id'   => 'nullable|uuid|exists:third_parties,id',
            'estimated_hours' => 'nullable|numeric|min:0',
            'engineer_comment' => 'nullable|string|max:5000',
            'created_at'       => 'required|date',
            'completed_at'     => 'nullable|date',
            'started_at'       => 'nullable|date',
        ]);

        // Trocar o equipamento não pode levar a OS para uma embarcação onde
        // quem edita não tem permissão (ex.: estagiário mover OS do AS pro CM1).
        $novoEquipamento = Equipment::find($validatedData['equipment_id']);
        if (! $this->canEdit($request->user(), $novoEquipamento?->vessel_id)) {
            abort(403, 'Você não pode mover a OS para um equipamento de outra embarcação.');
        }

        $this->validarOrigem($validatedData, $os);

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

        // Mesma trava do disparo: "Agendada" só para data no futuro (a do formulário).
        if (($validatedData['status'] ?? null) === 'scheduled' && $os->status !== 'scheduled') {
            $this->barrarAgendamentoNoPassado(substr((string) $validatedData['created_at'], 0, 10));
        }

        $statusAntes = $os->status;
        $this->workOrderService->updateWorkOrder($id, $validatedData, $request->user());

        if (isset($validatedData['status']) && $validatedData['status'] !== $statusAntes) {
            WorkOrderEvent::registrar($os, 'status', ['de' => $statusAntes, 'para' => $validatedData['status']]);
        }

        return redirect()->back()->with('success', 'Work Order updated successfully.');
    }

    public function destroy(Request $request, string $id)
    {
        $os = WorkOrder::with('equipment')->findOrFail($id);
        if (! $this->canEdit($request->user(), $os->equipment?->vessel_id)) {
            abort(403, 'Só dev, coordenador, engenheiro ou o estagiário da embarcação excluem esta OS.');
        }

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

    /**
     * Quem pode deixar a observação do engenheiro na OS: engenheiro e
     * coordenador. O dev não -- não escreve em nome da engenharia.
     */
    private function canComment(?User $user): bool
    {
        return in_array($user?->role->name ?? null, ['coordinator', 'engineer'], true);
    }

    /**
     * Origem da OS: plano de 52 semanas, docagem e atividade extra podem
     * ser combinadas, menos plano de 52 semanas + atividade extra (a
     * atividade extra é justamente o que está fora do plano). Campo não
     * enviado vale o que a OS já tem.
     */
    private function validarOrigem(array $dados, ?WorkOrder $os = null): void
    {
        $plano = (bool) ($dados['in_52_week_plan'] ?? $os?->in_52_week_plan);
        $extra = (bool) ($dados['is_extra_activity'] ?? $os?->is_extra_activity);

        if ($plano && $extra) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'is_extra_activity' => 'Uma OS do Plano de 52 Semanas não pode ser também Atividade Extra.',
            ]);
        }
    }

    /**
     * Editar e excluir OS: gestão (dev, coordenador, engenheiro) em qualquer
     * OS; estagiário só na OS da própria embarcação. É a mesma regra da tela
     * (EditWorkOrderModal/Show) -- aqui é a trava que vale, porque o pedido
     * pode chegar ao servidor sem passar pelo botão.
     */
    private function canEdit(?User $user, ?string $vesselId): bool
    {
        $roleName = $user?->role->name ?? null;

        if (in_array($roleName, ['dev', 'coordinator', 'engineer'], true)) {
            return true;
        }

        return $roleName === 'intern' && $vesselId !== null && $user->coversVessel($vesselId);
    }

    /**
     * Status segue a mesma regra da edição: gestão em qualquer OS;
     * estagiário só na OS da própria embarcação -- fora dela, continua só
     * aprovando (intern_status) pelo Planejamento.
     */
    private function canChangeStatus(?User $user, ?string $vesselId = null): bool
    {
        return $this->canEdit($user, $vesselId);
    }

    /**
     * Avaliação do estagiário (intern_status): gestão em qualquer OS; o
     * estagiário só nas OS das embarcações que ele acompanha.
     */
    private function canEvaluate(?User $user, ?string $vesselId = null): bool
    {
        $roleName = $user?->role->name ?? null;

        if (in_array($roleName, ['dev', 'coordinator', 'engineer'], true)) {
            return true;
        }

        return $roleName === 'intern' && $vesselId !== null && $user->coversVessel($vesselId);
    }

    /**
     * Inativar/reprogramar uma OS do plano: gestão e o estagiário da
     * embarcação (fica registrado no histórico quem fez).
     */
    private function canInactivate(?User $user, ?string $vesselId = null): bool
    {
        return $this->canEdit($user, $vesselId);
    }

    /** "Agendada" só faz sentido para data depois de hoje (a rotina diária libera na data). */
    private function barrarAgendamentoNoPassado(string $data): void
    {
        if ($data <= now('America/Sao_Paulo')->toDateString()) { // datas de OS guardam só o dia
            throw \Illuminate\Validation\ValidationException::withMessages([
                'status' => 'Esta OS está atrasada (ou é para hoje): não dá para agendá-la nessa data. Dispare agora ou reagende para o próximo ciclo ou uma nova data.',
            ]);
        }
    }

    private function ehGestao(?User $user): bool
    {
        return in_array($user?->role->name ?? null, ['dev', 'coordinator', 'engineer'], true);
    }

    /** Abrir a OS: gestão em qualquer uma; os demais, só da embarcação que acompanham. */
    private function canView(?User $user, ?string $vesselId): bool
    {
        if (in_array($user?->role->name ?? null, ['dev', 'coordinator', 'engineer'], true)) {
            return true;
        }

        return $user !== null && $vesselId !== null && $user->coversVessel($vesselId);
    }

    public function getAllWorkOrders()
    {
        // Traz a OS + Equipamento + Navio + Atividades + Quem fez a atividade + se existir uma SS vinculada
        return WorkOrder::with(['equipment.vessel', 'activities.responsibleUser', 'activities.updater:id,username,nickname', 'serviceRequest'])
                        ->orderBy('created_at', 'desc')
                        ->get();
    }

    public function updateInternStatus(Request $request, $id)
    {
        $os = WorkOrder::with('equipment')->findOrFail($id);

        if (! $this->canEvaluate($request->user(), $os->equipment?->vessel_id)) {
            abort(403, 'Só a gestão ou o estagiário da embarcação avaliam esta OS.');
        }

        $validated = $request->validate([
            'intern_status' => 'required|in:pending,approved,waiting',
            'intern_reason' => 'nullable|string|max:2000',
        ]);

        $reason = trim((string) ($validated['intern_reason'] ?? ''));
        $reason = $reason === '' ? null : $reason;
        $statusAntes = $os->intern_status ?: 'pending';
        $mudouStatus = $validated['intern_status'] !== $statusAntes;

        // Depois que a gestão aprovou, só a gestão desfaz: o estagiário não
        // muda mais a checagem (nem volta para Aguardando/Pendente).
        if ($mudouStatus && ! $this->ehGestao($request->user()) && $os->aprovadaPelaGestao()) {
            abort(403, 'Esta OS já foi aprovada pela engenharia: só o engenheiro (ou a coordenação) pode mudar a checagem.');
        }
        $mudouTexto = $reason !== $os->intern_reason;

        if (! $mudouStatus && ! $mudouTexto) {
            return back();
        }

        $dados = ['intern_status' => $validated['intern_status'], 'intern_reason' => $reason];

        // O nome de quem checou só muda quando a checagem muda -- editar o
        // texto (inclusive pelo engenheiro) não troca a assinatura. Vem de
        // quem está logado, não do corpo do request.
        if ($mudouStatus) {
            $dados['intern_name'] = $request->user()?->nickname ?: $request->user()?->username;
        }

        // A gestão tirando a OS de "aprovada": desfaz a aprovação dela.
        $desfezAprovacao = $mudouStatus && $validated['intern_status'] !== 'approved' && $os->approved_at !== null;
        if ($desfezAprovacao) {
            $dados['approved_by'] = null;
            $dados['approved_at'] = null;
        }

        $os->update($dados);

        // Histórico: cada mudança e cada texto ficam guardados com o autor e o cargo.
        $mudouStatus
            ? WorkOrderEvent::registrar($os, 'checagem', ['de' => $statusAntes, 'para' => $validated['intern_status'], 'nota' => $reason])
            : WorkOrderEvent::registrar($os, 'observacao', ['nota' => $reason ?? '(observação apagada)']);
        if ($desfezAprovacao) {
            WorkOrderEvent::registrar($os, 'aprovacao_desfeita', ['nota' => $reason]);
        }

        return back();
    }

    /**
     * Motivo da inativação/reprogramação escrito (ou corrigido) depois: quem
     * pode inativar pode comentar. O texto anterior fica no histórico.
     */
    public function updateInactivationReason(Request $request, string $id)
    {
        $os = WorkOrder::with('equipment')->findOrFail($id);

        if (! $this->canInactivate($request->user(), $os->equipment?->vessel_id)) {
            abort(403, 'Só a gestão ou o estagiário da embarcação comentam esta inativação.');
        }
        if (! $os->is_inactive) {
            throw \Illuminate\Validation\ValidationException::withMessages(['motivo' => 'Esta OS não está inativada.']);
        }

        $validated = $request->validate(['motivo' => 'nullable|string|max:2000']);
        $motivo = trim((string) ($validated['motivo'] ?? ''));
        $motivo = $motivo === '' ? null : $motivo;

        if ($motivo !== $os->inactivation_reason) {
            $os->update(['inactivation_reason' => $motivo]);
            WorkOrderEvent::registrar($os, 'motivo_inativacao', ['nota' => $motivo ?? '(motivo apagado)']);
        }

        return back()->with('success', 'Motivo da inativação salvo.');
    }

    /**
     * A ocorrência marcada não vai acontecer: inativa a OS e cria a
     * próxima, conforme a periodicidade ou numa nova data escolhida pelo
     * engenheiro (que também reancora as ocorrências futuras da mesma
     * tarefa -- ver WorkOrderService::inactivateWorkOrder).
     */
    public function inactivate(Request $request, string $id)
    {
        $alvo = WorkOrder::with('equipment')->findOrFail($id);

        if (! $this->canInactivate($request->user(), $alvo->equipment?->vessel_id)) {
            abort(403, 'Só a gestão ou o estagiário da embarcação inativam/reprogramam esta OS.');
        }

        $validated = $request->validate([
            'modo' => 'required|in:periodicidade,nova_data,sem_reagendamento',
            'nova_data' => 'required_if:modo,nova_data|nullable|date',
            'motivo' => 'nullable|string|max:2000',
            'agendar' => 'boolean', // atrasada: reagendar (nova OS já nasce agendada)
        ]);

        $resultado = $this->workOrderService->inactivateWorkOrder(
            $id,
            $validated['modo'],
            $request->user(),
            $validated['nova_data'] ?? null,
            $validated['motivo'] ?? null,
            (bool) ($validated['agendar'] ?? false),
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
            abort(403, 'Só dev, coordenador, engenheiro ou estagiário da própria embarcação mudam o status da OS.');
        }

        $request->validate([
            'status' => 'required|string|in:open,in_progress,scheduled,completed,cancelled',
            'justificativa' => 'nullable|string|max:2000',
        ]);

        // Disparo: aberta -> agendada/andamento, ou agendada -> andamento.
        $statusAntes = $os->status;
        $disparo = $statusAntes !== $request->status
            && in_array($statusAntes, ['open', 'scheduled'], true)
            && in_array($request->status, ['scheduled', 'in_progress'], true);
        $justificativa = trim((string) $request->input('justificativa', ''));

        // O estagiário marcou "Aguardando" (falta algo): dá para disparar
        // mesmo assim, mas com o motivo escrito -- fica no histórico.
        if ($disparo && $os->intern_status === 'waiting' && $justificativa === '') {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'justificativa' => 'A checagem está em "Aguardando". Para disparar mesmo assim, escreva o motivo.',
            ]);
        }

        // Trava: OS atrasada não vai para "Agendada" (agendar para uma data que
        // já passou não libera nunca). Ou dispara agora, ou reagenda para o
        // próximo ciclo / nova data (rota de inativação com agendar=true).
        if ($request->status === 'scheduled' && $statusAntes !== 'scheduled') {
            $this->barrarAgendamentoNoPassado($os->created_at->toDateString());
        }

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

        $checagemAntes = $os->intern_status ?: 'pending';
        $motivoAguardando = $os->intern_reason;
        $os->update($updateData);

        // Histórico: disparo ou mudança de status. Disparo sem a checagem
        // aprovada registra em que pé ela estava e o motivo de quem disparou.
        if ($statusAntes !== $request->status) {
            $nota = $justificativa !== '' ? $justificativa : null;
            if ($disparo && $checagemAntes === 'waiting') {
                $nota = 'Disparada mesmo com a checagem em "Aguardando"'
                    . ($motivoAguardando ? " (falta: {$motivoAguardando})" : '')
                    . ". Motivo: {$justificativa}";
            } elseif ($disparo && $checagemAntes === 'pending' && $nota) {
                $nota = "Disparada com a checagem ainda pendente. Comentário: {$nota}";
            }
            WorkOrderEvent::registrar($os, $disparo ? 'disparo' : 'status', ['de' => $statusAntes, 'para' => $request->status, 'nota' => $nota]);
        }

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