<?php

use App\Http\Controllers\EquipmentController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ServiceRequestController;
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
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/vessels', [VesselController::class, 'index'])->name('vessels.index');
    Route::get('/vessels/{id}', [VesselController::class, 'show'])->name('vessels.show');

    Route::get('/equipments', [EquipmentController::class, 'index'])->name('eq.index');
    Route::post('/equipments', [EquipmentController::class, 'store'])->name('equipments.store');
    Route::put('/equipments/{equipment}', [EquipmentController::class, 'update'])->name('equipments.update');
    Route::delete('/equipments/{equipment}', [EquipmentController::class, 'destroy'])->name('equipments.destroy');

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

    # Users routes
    Route::get('/crew', [UserController::class, 'index'])->name('crew.index');
    Route::post('/crew', [UserController::class, 'store'])->name('crew.store');
    Route::get('/crew/{id}', [UserController::class, 'show'])->name('crew.show');
    Route::put('/crew/{id}', [UserController::class, 'update'])->name('crew.update');
    Route::delete('/crew/{id}', [UserController::class, 'destroy'])->name('crew.destroy');
    Route::post('/crew/{id}/restore', [UserController::class, 'restore'])->name('crew.restore');

    Route::put('/vessels/{id}', [VesselController::class, 'update'])->name('vessels.update');

    Route::resource('dry-dockings', DryDockingController::class);
});

require __DIR__.'/auth.php';