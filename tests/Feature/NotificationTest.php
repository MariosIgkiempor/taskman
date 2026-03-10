<?php

use App\Models\Task;
use App\Models\User;
use App\Notifications\TaskReminderNotification;

test('can fetch unread notifications', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->scheduled()->create();

    $user->notify(new TaskReminderNotification($task, 5));

    $response = $this->actingAs($user)
        ->getJson(route('notifications.index'))
        ->assertSuccessful();

    expect($response->json('notifications'))->toHaveCount(1);
    expect($response->json('notifications.0.data.task_id'))->toBe($task->id);
    expect($response->json('notifications.0.data.minutes_before'))->toBe(5);
});

test('can mark a notification as read', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->scheduled()->create();

    $user->notify(new TaskReminderNotification($task, 15));
    $notification = $user->unreadNotifications()->first();

    $this->actingAs($user)
        ->patchJson(route('notifications.markAsRead', $notification->id))
        ->assertSuccessful();

    expect($user->unreadNotifications()->count())->toBe(0);
});

test('can mark all notifications as read', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->scheduled()->create();

    $user->notify(new TaskReminderNotification($task, 5));
    $user->notify(new TaskReminderNotification($task, 15));

    expect($user->unreadNotifications()->count())->toBe(2);

    $this->actingAs($user)
        ->postJson(route('notifications.markAllAsRead'))
        ->assertSuccessful();

    expect($user->fresh()->unreadNotifications()->count())->toBe(0);
});

test('guests cannot access notifications', function () {
    $this->getJson(route('notifications.index'))->assertUnauthorized();
});

test('unread notifications count is shared in inertia props', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->scheduled()->create();

    $user->notify(new TaskReminderNotification($task, 5));

    $response = $this->actingAs($user)
        ->get(route('tasks.index'))
        ->assertOk();

    $props = $response->original->getData()['page']['props'];

    expect($props['unreadNotificationsCount'])->toBe(1);
});
