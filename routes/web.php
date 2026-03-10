<?php

use App\Http\Controllers\GeocodeController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TaskReminderController;
use App\Http\Controllers\TaskTagController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::get('tasks', [TaskController::class, 'index'])->name('tasks.index');
    Route::post('tasks', [TaskController::class, 'store'])->name('tasks.store');
    Route::patch('tasks/{task}', [TaskController::class, 'update'])->name('tasks.update');
    Route::patch('tasks/{task}/schedule', [TaskController::class, 'schedule'])->name('tasks.schedule');
    Route::patch('tasks/{task}/unschedule', [TaskController::class, 'unschedule'])->name('tasks.unschedule');
    Route::delete('tasks/{task}', [TaskController::class, 'destroy'])->name('tasks.destroy');

    Route::get('tags', [TagController::class, 'index'])->name('tags.index');
    Route::post('tags', [TagController::class, 'store'])->name('tags.store');
    Route::patch('tags/{tag}', [TagController::class, 'update'])->name('tags.update');
    Route::delete('tags/{tag}', [TagController::class, 'destroy'])->name('tags.destroy');

    Route::patch('tasks/{task}/tags', [TaskTagController::class, 'sync'])->name('tasks.tags.sync');
    Route::put('tasks/{task}/reminders', [TaskReminderController::class, 'sync'])->name('tasks.reminders.sync');
    Route::patch('tasks/{task}/reminders/rearm', [TaskReminderController::class, 'rearm'])->name('tasks.reminders.rearm');

    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::patch('notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.markAsRead');
    Route::post('notifications/mark-all-read', [NotificationController::class, 'markAllAsRead'])->name('notifications.markAllAsRead');

    Route::get('geocode', GeocodeController::class)->name('geocode');
});

require __DIR__.'/settings.php';
