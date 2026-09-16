<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EquipmentController;
use App\Http\Controllers\EquipmentTagMigrationController;
use App\Http\Controllers\ComponentController;
use App\Http\Controllers\ExecutionWindowController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ServiceRequestController;
use App\Http\Controllers\ThirdPartyController;
use App\Http\Controllers\WorkOrderController;
use App\Http\Controllers\WorkOrderActivityController;
use App\Http\Controllers\CrewController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VesselController;
use App\Http\Controllers\DryDockingController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
})->middleware('guest');

Route::get('/dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth', 'verified', 'third_party'])->name('dashboard');

Route::middleware(['auth', 'third_party'])->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::middleware(['auth', 'verified', 'third_party'])->group(function () {
    Route::get('/vessels', [VesselController::class, 'index'])->name('vessels.index');
    Route::get('/vessels/{id}', [VesselController::class, 'show'])->name('vessels.show');

    // Ferramenta local (dev only) de migração de tags pra nova árvore de equipamentos --
    // tem que vir ANTES de /equipments/{id}, senão "tag-migration" é capturado como {id}.
    Route::get('/equipments/tag-migration/{vessel?}', [EquipmentTagMigrationController::class, 'index'])->name('equipments.tag-migration');
    Route::post('/equipments/tag-migration/vincular', [EquipmentTagMigrationController::class, 'vincular'])->name('equipments.tag-migration.vincular');
    Route::post('/equipments/tag-migration/criar-novo', [EquipmentTagMigrationController::class, 'criarNovo'])->name('equipments.tag-migration.criar-novo');
    Route::post('/equipments/tag-migration/ignorar', [EquipmentTagMigrationController::class, 'ignorar'])->name('equipments.tag-migration.ignorar');
    Route::post('/equipments/tag-migration/desfazer', [EquipmentTagMigrationController::class, 'desfazer'])->name('equipments.tag-migration.desfazer');

    Route::get('/equipments', [EquipmentController::class, 'index'])->name('eq.index');
    Route::get('/equipments/{id}', [EquipmentController::class, 'show'])->name('equipments.show');
    Route::post('/equipments', [EquipmentController::class, 'store'])->name('equipments.store');
    Route::put('/equipments/{equipment}', [EquipmentController::class, 'update'])->name('equipments.update');
    Route::delete('/equipments/{equipment}', [EquipmentController::class, 'destroy'])->name('equipments.destroy');

    // Componentes (nível opcional abaixo do equipamento)
    Route::post('/components', [ComponentController::class, 'store'])->name('components.store');
    Route::put('/components/{id}', [ComponentController::class, 'update'])->name('components.update');
    Route::delete('/components/{id}', [ComponentController::class, 'destroy'])->name('components.destroy');

    // Service Requests
    Route::get('/service-requests', [ServiceRequestController::class, 'index'])->name('service-requests.index');
    Route::post('/service-requests', [ServiceRequestController::class, 'store'])->name('service-requests.store');
    Route::put('/service-requests/{id}', [ServiceRequestController::class, 'update'])->name('service-requests.update');
    Route::delete('/service-requests/{id}', [ServiceRequestController::class, 'destroy'])->name('service-requests.destroy');

    // Work Orders
    Route::resource('work-orders', WorkOrderController::class)->except(['create', 'edit']);

    // Work Order Activities 
    Route::post('/work-order-activities', [WorkOrderActivityController::class, 'store'])->name('work-order-activities.store');
    Route::put('/work-order-activities/{id}', [WorkOrderActivityController::class, 'update'])->name('work-order-activities.update'); 
    Route::delete('/work-order-activities/{id}', [WorkOrderActivityController::class, 'destroy'])->name('work-order-activities.destroy');
    Route::put('/work-orders/{id}/intern-status', [WorkOrderController::class, 'updateInternStatus'])->name('work-orders.intern-status');
    Route::put('/work-orders/{id}/status', [WorkOrderController::class, 'updateStatus'])->name('work-orders.update-status');
    Route::post('/work-orders/{id}/inactivate', [WorkOrderController::class, 'inactivate'])->name('work-orders.inactivate');

    // Janelas de Execução (lote de OS agrupado por disponibilidade da embarcação)
    Route::resource('execution-windows', ExecutionWindowController::class)->only(['index', 'show', 'store', 'update', 'destroy']);

    # Users routes
    Route::get('/crew', [UserController::class, 'index'])->name('crew.index');
    Route::post('/crew', [UserController::class, 'store'])->name('crew.store');
    Route::get('/crew/{id}', [UserController::class, 'show'])->name('crew.show');
    Route::put('/crew/{id}', [UserController::class, 'update'])->name('crew.update');
    Route::put('/crew/{id}/reset-password', [UserController::class, 'resetPassword'])->name('crew.reset-password');
    Route::delete('/crew/{id}', [UserController::class, 'destroy'])->name('crew.destroy');
    Route::post('/crew/{id}/restore', [UserController::class, 'restore'])->name('crew.restore');

    Route::put('/vessels/{id}', [VesselController::class, 'update'])->name('vessels.update');

    // Terceiros (empresas terceirizadas) — gestão restrita a managers
    Route::get('/third-parties', [ThirdPartyController::class, 'index'])->name('third-parties.index');
    Route::post('/third-parties', [ThirdPartyController::class, 'store'])->name('third-parties.store');
    Route::put('/third-parties/{id}', [ThirdPartyController::class, 'update'])->name('third-parties.update');
    Route::delete('/third-parties/{id}', [ThirdPartyController::class, 'destroy'])->name('third-parties.destroy');
    Route::post('/third-parties/{id}/restore', [ThirdPartyController::class, 'restore'])->name('third-parties.restore');

    // Notificações do perfil (sino)
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.read');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.read-all');
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy'])->name('notifications.destroy');
    Route::delete('/notifications', [NotificationController::class, 'destroyAll'])->name('notifications.destroy-all');

    Route::resource('dry-dockings', DryDockingController::class);
});

require __DIR__.'/auth.php';