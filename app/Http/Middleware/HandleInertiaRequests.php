<?php

namespace App\Http\Middleware;

use App\Models\DryDocking;
use App\Models\ServiceRequest;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $request->user() ? [
                    'id'       => $request->user()->id,
                    'name'     => $request->user()->username,
                    'email'    => $request->user()->email,
                    'nickname' => $request->user()->nickname,
                    'role' => $request->user()->role->name ?? $request->user()->role, 
                    'vessel_id'     => $request->user()->vessel_id,
                    'has_fleet_access' => $request->user()->has_fleet_access,
                ] : null,
            ],

            // Notificações do perfil (sino). Só as 10 mais recentes para não pesar cada request.
            'notifications' => fn () => $request->user() ? [
                'items' => $request->user()
                    ->notifications()
                    ->latest()
                    ->take(10)
                    ->get()
                    ->map(fn ($notification) => [
                        'id'      => $notification->id,
                        'data'    => $notification->data,
                        'read_at' => $notification->read_at,
                        'created_at' => $notification->created_at,
                    ]),
                'unread_count' => $request->user()->unreadNotifications()->count(),
            ] : null,

            // Contadores dos badges da sidebar. O terceiro só vê a contagem das próprias OS
            // (mesmo escopo aplicado em WorkOrderController@index).
            'sidebarCounts' => fn () => $request->user() ? [
                'workOrders' => WorkOrder::query()
                    ->when(
                        ($request->user()->role->name ?? null) === 'terceiro',
                        fn ($query) => $query->where('third_party_id', $request->user()->third_party_id)
                    )
                    ->whereIn('status', ['open', 'in_progress'])
                    ->count(),
                'serviceRequests' => ServiceRequest::where('status', 'pending')->count(),
                'dryDockings' => DryDocking::whereIn('status', ['planning', 'in_progress'])->count(),
            ] : null,
        ]);
    }
}
