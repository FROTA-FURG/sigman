<?php

namespace App\Services;

use App\Models\Equipment;
use App\Models\User;
use App\Models\WorkOrder;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WorkOrderService
{
    /** Fuso de quem conclui as OS (o app roda em UTC). */
    private const FUSO_DA_EQUIPE = 'America/Sao_Paulo';

    public function getAllWorkOrders(?string $thirdPartyId = null)
    {
        // Traz as OS ordenadas pelas mais recentes, incluindo os dados do equipamento,
        // as atividades (junto com quem fez a atividade) e quem aprovou/disparou
        // (pro Planejamento do estagiário mostrar quem validou a OS dele).
        // Se $thirdPartyId for informado, limita às OS daquela empresa terceirizada.
        return WorkOrder::with(['equipment.vessel', 'activities.responsibleUser', 'thirdParty', 'approver'])
                        ->when($thirdPartyId, fn ($q) => $q->where('third_party_id', $thirdPartyId))
                        ->orderBy('created_at', 'desc')
                        ->get();
    }

    public function getWorkOrderById(string $id)
    {
        return WorkOrder::with([
            'equipment.vessel', 'activities.responsibleUser', 'serviceRequest', 'approver', 'thirdParty',
            'inactivatedByUser', 'rescheduledFrom', 'rescheduledTo',
        ])->findOrFail($id);
    }

    /**
     * Normaliza string vazia pra null nos campos de data/hora reais. Carbon
     * trata '' como "agora" (mesma regra do construtor de DateTime nativo do
     * PHP), então sem isso um campo deixado em branco no formulário viraria
     * silenciosamente "agora" ao salvar -- em vez de continuar em branco.
     */
    private function normalizarDatasVazias(array $data): array
    {
        foreach (['started_at', 'completed_at'] as $campo) {
            if (($data[$campo] ?? null) === '') {
                $data[$campo] = null;
            }
        }

        return $data;
    }

    public function createWorkOrder(array $data)
    {
        $data = $this->normalizarDatasVazias($data);

        // 1. Busca o equipamento para fazer o "Snapshot" histórico
        $equipment = Equipment::findOrFail($data['equipment_id']);

        // 2. Preenche os campos automáticos baseados no equipamento no momento da criação
        $data['tag_number'] = $equipment->tag_number;
        $data['series_number_id'] = $equipment->series_number;
        $data['model'] = $equipment->model;
        $data['manufacturer'] = $equipment->manufacturer;

        // Se o status já vier como concluído na criação -- lançamento de OS já
        // realizada, por exemplo -- preenche a Data Fim quando não foi
        // informada. Sem data melhor, assume o mesmo dia da OS (não "agora":
        // pra um lançamento histórico isso quase sempre estaria errado).
        if ($data['status'] === 'completed' && empty($data['completed_at'])) {
            $data['completed_at'] = $data['created_at'] ?? now();
        }
        if ($data['status'] === 'in_progress' && empty($data['started_at'])) {
            $data['started_at'] = now();
        }

        $workOrder = WorkOrder::create($data);

        // Mesma regra de uma preventiva concluída via edição: se já nasce
        // concluída (lançamento de OS antiga) e tem periodicidade com
        // intervalo fixo, já gera a próxima ocorrência sozinha.
        if ($workOrder->status === 'completed') {
            $this->regenerateIfPreventiveCompleted($workOrder);
        }

        return $workOrder;
    }

    public function updateWorkOrder(string $id, array $data, ?\App\Models\User $actor = null)
    {
        $data = $this->normalizarDatasVazias($data);

        $workOrder = WorkOrder::findOrFail($id);

        // Carimba autor e data só quando o texto realmente mudou, senão
        // qualquer save da OS reescreveria a assinatura de um comentário
        // que ninguém tocou.
        if (array_key_exists('engineer_comment', $data)) {
            $novo = trim((string) $data['engineer_comment']);
            $data['engineer_comment'] = $novo === '' ? null : $novo;

            if ($data['engineer_comment'] !== $workOrder->engineer_comment) {
                $data['engineer_comment_by'] = $data['engineer_comment'] === null
                    ? null
                    : ($actor?->nickname ?: $actor?->username);
                $data['engineer_comment_at'] = $data['engineer_comment'] === null ? null : now();
            }
        }

        // Regra de negócio: Se o usuário mudar o status para 'completed', setamos a data atual automaticamente.
        // Se mudar de 'completed' de volta para 'in_progress', limpamos a data de conclusão.
        // Em ambos os casos, se o usuário já mandou a Data Fim no formulário (lançamento de
        // OS antiga, por exemplo), essa escolha prevalece sobre o automático.
        if (isset($data['status'])) {
            if ($data['status'] === 'completed' && is_null($workOrder->completed_at) && empty($data['completed_at'])) {
                $data['completed_at'] = now();
            } elseif ($data['status'] !== 'completed' && empty($data['completed_at'])) {
                $data['completed_at'] = null;
            }

            // Mesma ideia pro início: primeira vez que a OS entra em andamento,
            // marca quando aconteceu de verdade. Diferente da conclusão, não
            // apaga se o status sair de 'in_progress' depois -- já começou,
            // isso é fato histórico, não reflete o status atual. Se o usuário
            // já mandou o started_at no formulário (correção manual), essa
            // escolha prevalece sobre o automático.
            if ($data['status'] === 'in_progress' && is_null($workOrder->started_at) && empty($data['started_at'])) {
                $data['started_at'] = now();
            }
        }

        $workOrder->update($data);

        if (($data['status'] ?? null) === 'completed') {
            $this->regenerateIfPreventiveCompleted($workOrder->fresh());
        }

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

    /**
     * A ocorrência marcada não vai acontecer -- inativa a OS e, dependendo
     * do modo, cria a próxima:
     *
     *   'periodicidade'     -> nova data = data atual + intervalo da
     *                          periodicidade (ex.: +3 meses numa trimestral).
     *                          Só mexe nesta OS; as demais ocorrências da
     *                          mesma tarefa que já existirem no plano ficam
     *                          como estão.
     *   'nova_data'         -> nova data escolhida pelo engenheiro. As
     *                          ocorrências futuras dessa mesma tarefa (mesmo
     *                          equipamento + descrição + periodicidade, ainda
     *                          ativas) são reancoradas a partir dela, mantendo
     *                          o espaçamento da periodicidade -- equivalente ao
     *                          "este e os próximos eventos" do Google Agenda.
     *   'sem_reagendamento' -> só inativa, sem criar nenhuma OS nova nem
     *                          mexer em data nenhuma -- a tarefa simplesmente
     *                          não vai mais acontecer por essa via.
     *
     * A flag `is_inactive` é o que a interface usa pra diferenciar de um
     * cancelamento comum, mas o `status` também vira 'cancelled': é assim
     * que a OS sai das métricas (atrasadas, horas da semana, conclusão) sem
     * precisar reescrever cada lugar que já exclui 'cancelled' hoje.
     *
     * @return array{antiga: WorkOrder, nova: ?WorkOrder, reancoradas: int}
     */
    public function inactivateWorkOrder(string $id, string $modo, ?User $actor, ?string $novaData = null, ?string $motivo = null): array
    {
        $original = WorkOrder::with('equipment.vessel')->findOrFail($id);

        if ($original->is_inactive) {
            throw ValidationException::withMessages(['status' => 'Esta OS já foi inativada.']);
        }
        if (! $original->periodicity) {
            throw ValidationException::withMessages(['periodicity' => 'Só é possível inativar OS com periodicidade definida (do plano de 52 semanas).']);
        }

        $dataOriginal = Carbon::parse($original->created_at);
        $novaDataCarbon = null;

        if ($modo === 'periodicidade') {
            $novaDataCarbon = PeriodicityInterval::proximaData($original->periodicity, $dataOriginal);
            if ($novaDataCarbon === null) {
                throw ValidationException::withMessages([
                    'modo' => "A periodicidade \"{$original->periodicity}\" não tem um intervalo de calendário fixo (ex.: docagem, ou periodicidade por horas de uso). Escolha uma nova data manualmente.",
                ]);
            }
        } elseif ($modo === 'nova_data') {
            if (! $novaData) {
                throw ValidationException::withMessages(['nova_data' => 'Informe a nova data.']);
            }
            $novaDataCarbon = Carbon::parse($novaData);
        } elseif ($modo !== 'sem_reagendamento') {
            throw ValidationException::withMessages(['modo' => 'Modo de reprogramação inválido.']);
        }

        return DB::transaction(function () use ($original, $modo, $novaDataCarbon, $motivo, $actor, $dataOriginal) {
            $nova = null;

            if ($novaDataCarbon !== null) {
                $vesselTag = $original->equipment->vessel->tag ?? 'ERR';

                $nova = WorkOrder::create([
                    'equipment_id' => $original->equipment_id,
                    'tag_number' => $original->tag_number,
                    'series_number_id' => $original->series_number_id,
                    'description' => $original->description,
                    'model' => $original->model,
                    'manufacturer' => $original->manufacturer,
                    'maintenance_type' => $original->maintenance_type,
                    'priority' => $original->priority,
                    'periodicity' => $original->periodicity,
                    'in_52_week_plan' => $original->in_52_week_plan,
                    'estimated_hours' => $original->estimated_hours,
                    'status' => 'open',
                    'os_number' => $this->proximoOsNumber($vesselTag),
                    'created_at' => $novaDataCarbon,
                    'rescheduled_from_id' => $original->id,
                ]);
            }

            $original->update([
                'status' => 'cancelled',
                'is_inactive' => true,
                'inactivated_at' => now(),
                'inactivated_by' => $actor?->id,
                'inactivation_reason' => $motivo ? trim($motivo) : null,
            ]);

            $reancoradas = 0;
            if ($modo === 'nova_data') {
                $reancoradas = $this->reancorarOcorrenciasFuturas($original, $nova, $dataOriginal, $novaDataCarbon);
            }

            return ['antiga' => $original->fresh(), 'nova' => $nova, 'reancoradas' => $reancoradas];
        });
    }

    /**
     * Desloca as ocorrências futuras da mesma tarefa (mesmo equipamento +
     * descrição + periodicidade, ainda ativas, com data depois da que foi
     * inativada) pra passarem a respeitar o intervalo da periodicidade a
     * partir da nova data -- sem isso, mudar só a próxima OS deixaria as
     * demais do ano fora de cadência com o novo ponto de partida.
     *
     * Se a periodicidade não tiver intervalo de calendário fixo (docagem,
     * horas de uso), não reancora nada -- não tem como recalcular sem uma
     * data-base confiável.
     */
    private function reancorarOcorrenciasFuturas(WorkOrder $original, WorkOrder $nova, Carbon $dataAntiga, Carbon $novaData): int
    {
        if (! PeriodicityInterval::hasInterval($original->periodicity)) {
            return 0;
        }

        $futuras = WorkOrder::where('equipment_id', $original->equipment_id)
            ->where('description', $original->description)
            ->where('periodicity', $original->periodicity)
            ->where('is_inactive', false)
            ->where('status', '!=', 'cancelled')
            ->where('id', '!=', $nova->id) // a OS que acabou de nascer já está na data certa
            ->where('created_at', '>', $dataAntiga)
            ->orderBy('created_at')
            ->get();

        foreach ($futuras as $posicao => $os) {
            $os->update(['created_at' => PeriodicityInterval::proximaData($original->periodicity, $novaData, $posicao + 1)]);
        }

        return $futuras->count();
    }

    /**
     * Preventiva do plano concluída: gera a próxima ocorrência sozinha, a
     * partir de quando foi CONCLUÍDA de verdade (completed_at) -- não da
     * data prevista original (created_at) -- assim o intervalo reflete o
     * serviço real, não o papel. Ex.: prevista 03/03/2026, concluída
     * 05/03/2026, anual -> próxima em 05/03/2027.
     *
     * Idempotente: se essa OS já tiver gerado uma sucessora antes (via
     * rescheduled_from_id, o mesmo vínculo usado pela inativação manual),
     * não duplica -- útil se o status oscilar entre completed e outra coisa
     * mais de uma vez. Só entra em ação pra preventiva com periodicidade que
     * tenha intervalo de calendário fixo (não entra em docagem/horas de uso).
     */
    public function regenerateIfPreventiveCompleted(WorkOrder $workOrder): ?WorkOrder
    {
        if ($workOrder->maintenance_type !== 'preventive') {
            return null;
        }
        if (is_null($workOrder->completed_at)) {
            return null;
        }
        if (! PeriodicityInterval::hasInterval($workOrder->periodicity)) {
            return null;
        }
        if ($workOrder->rescheduledTo()->exists()) {
            return null;
        }

        // completed_at é um instante em UTC; a base é o DIA em que a OS foi
        // concluída no horário da equipe. Sem isso, concluir depois das 21h
        // (meia-noite em UTC) jogava a próxima OS um dia pra frente. A nova
        // OS guarda só a data (meia-noite), como toda data-alvo de OS.
        $diaConclusao = Carbon::parse($workOrder->completed_at)
            ->setTimezone(self::FUSO_DA_EQUIPE)
            ->startOfDay();

        $proxima = PeriodicityInterval::proximaData($workOrder->periodicity, $diaConclusao);
        if ($proxima === null) {
            return null;
        }
        $novaData = $proxima->format('Y-m-d');

        $workOrder->loadMissing('equipment.vessel');
        $vesselTag = $workOrder->equipment->vessel->tag ?? 'ERR';

        return WorkOrder::create([
            'equipment_id' => $workOrder->equipment_id,
            'tag_number' => $workOrder->tag_number,
            'series_number_id' => $workOrder->series_number_id,
            'description' => $workOrder->description,
            'model' => $workOrder->model,
            'manufacturer' => $workOrder->manufacturer,
            'maintenance_type' => $workOrder->maintenance_type,
            'priority' => $workOrder->priority,
            'periodicity' => $workOrder->periodicity,
            // Cast: OS criada sem o campo fica com null no objeto (o default false
            // é do banco), e a coluna não aceita null.
            'in_52_week_plan' => (bool) $workOrder->in_52_week_plan,
            'estimated_hours' => $workOrder->estimated_hours,
            'status' => 'open',
            'os_number' => $this->proximoOsNumber($vesselTag),
            'created_at' => $novaData,
            'rescheduled_from_id' => $workOrder->id,
        ]);
    }

    private function proximoOsNumber(string $vesselTag): string
    {
        $ultima = WorkOrder::where('os_number', 'like', $vesselTag . '%')
            ->orderBy('os_number', 'desc')
            ->first();

        $proximoNumero = $ultima ? intval(str_replace($vesselTag, '', $ultima->os_number)) + 1 : 1;

        return $vesselTag . str_pad((string) $proximoNumero, 4, '0', STR_PAD_LEFT);
    }
}