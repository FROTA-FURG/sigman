<?php

namespace App\Console\Commands;

use App\Models\WorkOrder;
use App\Services\WorkOrderDispatchNotifier;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('app:check-scheduled-os')]
#[Description('Libera as OS agendadas cuja data chegou e notifica os responsáveis')]
class CheckScheduledOS extends Command
{
    public function handle(WorkOrderDispatchNotifier $notifier)
    {
        // Pega todas as OS agendadas cuja data prevista é igual ou menor que hoje
        $workOrders = WorkOrder::with('equipment.vessel')
            ->where('status', 'scheduled')
            ->whereDate('created_at', '<=', now()->toDateString())
            ->get();

        $notifiedCount = 0;

        foreach ($workOrders as $os) {
            $os->update(['status' => 'open']);

            // A data chegou: agora a OS está em vigor, então os responsáveis são avisados.
            if ($notifier->notifyIfDispatched($os)) {
                $notifiedCount++;
            }
        }

        $this->info($workOrders->count() . ' OSs foram movidas de Agendada para Aberta.');
        $this->info($notifiedCount . ' OSs tiveram os responsáveis notificados por e-mail.');
    }
}
