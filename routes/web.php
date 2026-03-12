<?php

use App\Http\Controllers\BoardController;
use App\Http\Controllers\GeocodeController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TaskReminderController;
use App\Http\Controllers\TaskTagController;
use App\Http\Controllers\WorkspaceController;
use App\Http\Controllers\WorkspaceInviteController;
use App\Http\Controllers\WorkspaceMemberController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::get('invite/{token}', [WorkspaceInviteController::class, 'accept'])->name('workspaces.invites.accept');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', fn () => redirect()->route('tasks.index', auth()->user()->personalWorkspace))->name('dashboard');

    // Workspaces
    Route::get('workspaces', [WorkspaceController::class, 'index'])->name('workspaces.index');
    Route::post('workspaces', [WorkspaceController::class, 'store'])->name('workspaces.store');
    Route::get('workspaces/{workspace}/settings', [WorkspaceController::class, 'settings'])->name('workspaces.settings');
    Route::get('workspaces/{workspace}/members-page', [WorkspaceController::class, 'members'])->name('workspaces.members.page');
    Route::patch('workspaces/{workspace}', [WorkspaceController::class, 'update'])->name('workspaces.update');
    Route::delete('workspaces/{workspace}', [WorkspaceController::class, 'destroy'])->name('workspaces.destroy');

    // Boards
    Route::post('workspaces/{workspace}/boards', [BoardController::class, 'store'])->name('boards.store');
    Route::patch('boards/{board}', [BoardController::class, 'update'])->name('boards.update');
    Route::delete('boards/{board}', [BoardController::class, 'destroy'])->name('boards.destroy');

    // Members
    Route::get('workspaces/{workspace}/members', [WorkspaceMemberController::class, 'index'])->name('workspaces.members.index');
    Route::patch('workspaces/{workspace}/members/{member}', [WorkspaceMemberController::class, 'update'])->name('workspaces.members.update');
    Route::delete('workspaces/{workspace}/members/{member}', [WorkspaceMemberController::class, 'destroy'])->name('workspaces.members.destroy');

    // Invites
    Route::post('workspaces/{workspace}/invites', [WorkspaceInviteController::class, 'store'])->name('workspaces.invites.store');
    Route::delete('workspace-invites/{workspaceInvite}', [WorkspaceInviteController::class, 'destroy'])->name('workspaces.invites.destroy');

    // Tasks (index/store scoped to workspace)
    Route::get('workspaces/{workspace}/tasks', [TaskController::class, 'index'])->name('tasks.index');
    Route::post('workspaces/{workspace}/tasks', [TaskController::class, 'store'])->name('tasks.store');

    // Tasks (flat mutations)
    Route::patch('tasks/{task}', [TaskController::class, 'update'])->name('tasks.update');
    Route::patch('tasks/{task}/schedule', [TaskController::class, 'schedule'])->name('tasks.schedule');
    Route::patch('tasks/{task}/unschedule', [TaskController::class, 'unschedule'])->name('tasks.unschedule');
    Route::post('tasks/{task}/duplicate', [TaskController::class, 'duplicate'])->name('tasks.duplicate');
    Route::delete('tasks/{task}', [TaskController::class, 'destroy'])->name('tasks.destroy');

    // Tags (index/store scoped to workspace)
    Route::get('workspaces/{workspace}/tags', [TagController::class, 'index'])->name('tags.index');
    Route::post('workspaces/{workspace}/tags', [TagController::class, 'store'])->name('tags.store');

    // Tags (flat mutations)
    Route::patch('tags/{tag}', [TagController::class, 'update'])->name('tags.update');
    Route::delete('tags/{tag}', [TagController::class, 'destroy'])->name('tags.destroy');

    // Task sub-resources
    Route::patch('tasks/{task}/tags', [TaskTagController::class, 'sync'])->name('tasks.tags.sync');
    Route::put('tasks/{task}/reminders', [TaskReminderController::class, 'sync'])->name('tasks.reminders.sync');
    Route::patch('tasks/{task}/reminders/rearm', [TaskReminderController::class, 'rearm'])->name('tasks.reminders.rearm');

    // Notifications
    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::patch('notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.markAsRead');
    Route::post('notifications/mark-all-read', [NotificationController::class, 'markAllAsRead'])->name('notifications.markAllAsRead');

    // Geocode
    Route::get('geocode', GeocodeController::class)->name('geocode');
});

require __DIR__.'/settings.php';
