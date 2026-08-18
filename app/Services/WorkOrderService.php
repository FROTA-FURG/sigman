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

    public function updateWorkOrder(string $id, array $data, ?\App\Models\User $actor = null)
    {
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

    /**
     * A ocorrência marcada não vai acontecer -- inativa a OS e cria a
     * próxima, de um dos dois jeitos:
     *
     *   'periodicidade' -> nova data = data atual + intervalo da
     *                       periodicidade (ex.: +3 meses numa trimestral).
     *                       Só mexe nesta OS; as demais ocorrências da
     *                       mesma tarefa que já existirem no plano ficam
     *                       como estão.
     *   'nova_data'     -> nova data escolhida pelo engenheiro. As
     *                       ocorrências futuras dessa mesma tarefa (mesmo
     *                       equipamento + descrição + periodicidade, ainda
     *                       ativas) são reancoradas a partir dela, mantendo
     *                       o espaçamento da periodicidade -- equivalente ao
     *                       "este e os próximos eventos" do Google Agenda.
     *
     * A flag `is_inactive` é o que a interface usa pra diferenciar de um
     * cancelamento comum, mas o `status` também vira 'cancelled': é assim
     * que a OS sai das métricas (atrasadas, horas da semana, conclusão) sem
     * precisar reescrever cada lugar que já exclui 'cancelled' hoje.
     *
     * @return array{antiga: WorkOrder, nova: WorkOrder, reancoradas: int}
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
        } else {
            throw ValidationException::withMessages(['modo' => 'Modo de reprogramação inválido.']);
        }

        return DB::transaction(function () use ($original, $modo, $novaDataCarbon, $motivo, $actor, $dataOriginal) {
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

    private function proximoOsNumber(string $vesselTag): string
    {
        $ultima = WorkOrder::where('os_number', 'like', $vesselTag . '%')
            ->orderBy('os_number', 'desc')
            ->first();

        $proximoNumero = $ultima ? intval(str_replace($vesselTag, '', $ultima->os_number)) + 1 : 1;

        return $vesselTag . str_pad((string) $proximoNumero, 4, '0', STR_PAD_LEFT);
    }
}