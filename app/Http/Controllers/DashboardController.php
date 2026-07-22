<?php

namespace App\Http\Controllers;

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

        return Inertia::render('Dashboard');
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
