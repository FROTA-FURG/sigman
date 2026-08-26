<?php

namespace App\Http\Controllers;

use App\Models\Equipment;
use App\Models\ServiceRequest;
use App\Models\Vessel;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    /**
     * O terceiro tem um dashboard dedicado, escopado às OS da empresa dele.
     * Os demais perfis continuam vendo o painel geral do SIGMAN (inalterado).
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if (($user->role->name ?? null) === 'terceiro') {
            return $this->thirdPartyDashboard($user->third_party_id);
        }

        $vessels = Vessel::orderBy('name')->get([
            'id', 'name', 'type', 'status', 'navigation_status', 'health_score', 'location',
            'last_inspection', 'builder', 'year',
        ]);

        return Inertia::render('Dashboard', [
            // Embarcações reais da frota. A telemetria (localização, motor, óleo etc.)
            // ainda não existe — é simulada no front até a integração dos sensores.
            'vessels' => $vessels,
            'kpis' => $this->buildKpis($vessels),
        ]);
    }

    /** Números reais da barra de KPIs do painel geral (KpiCards.jsx) -- antes eram mockados no front. */
    private function buildKpis($vessels)
    {
        $equipmentByStatus = Equipment::selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return [
            'vessels' => [
                'total' => $vessels->count(),
                'operational' => $vessels->where('status', 'Operacional')->count(),
                'maintenance_names' => $vessels->where('status', 'Manutenção')->pluck('name')->values(),
            ],
            'equipment' => [
                'total' => $equipmentByStatus->sum(),
                'active' => $equipmentByStatus->get('active', 0),
                'inactive' => $equipmentByStatus->get('inactive', 0),
                'in_maintenance' => $equipmentByStatus->get('in_maintenance', 0),
                'decommissioned' => $equipmentByStatus->get('decommissioned', 0),
            ],
            'work_orders_in_progress' => WorkOrder::where('status', 'in_progress')->count(),
            // Pendente = ainda não avaliada pelo gestor (as demais já saíram do estado "aberta").
            'service_requests_open' => ServiceRequest::where('status', 'pending')->count(),
        ];
    }

    private function thirdPartyDashboard(?string $thirdPartyId)
    {
        $workOrders = WorkOrder::with(['equipment.vessel'])
            ->where('third_party_id', $thirdPartyId)
            ->orderBy('created_at', 'desc')
            ->get();

        $today = now()->startOfDay();

        $stats = [
            'total'       => $workOrders->count(),
            'open'        => $workOrders->where('status', 'open')->count(),
            'in_progress' => $workOrders->where('status', 'in_progress')->count(),
            'completed'   => $workOrders->where('status', 'completed')->count(),
            // Atrasada: ainda não concluída e com data prevista no passado
            'delayed'     => $workOrders
                ->whereNotIn('status', ['completed', 'cancelled'])
                ->filter(fn ($os) => $os->created_at && $os->created_at->startOfDay()->lt($today))
                ->count(),
        ];

        return Inertia::render('ThirdParty/Dashboard', [
            'workOrders' => $workOrders,
            'stats'      => $stats,
        ]);
    }
}
