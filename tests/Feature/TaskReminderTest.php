<?php

use App\Models\Task;
use App\Models\TaskReminder;
use App\Models\User;
use App\Notifications\TaskReminderNotification;

test('can sync reminders for a scheduled task', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->scheduled()->create();

    $this->actingAs($user)
        ->putJson(route('tasks.reminders.sync', $task), ['reminders' => [1, 5, 15]])
        ->assertSuccessful();

    expect($task->reminders()->count())->toBe(3);
    expect($task->reminders()->pluck('minutes_before')->sort()->values()->all())->toBe([1, 5, 15]);
});

test('syncing reminders replaces existing ones', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->scheduled()->create();

    TaskReminder::factory()->for($task)->create(['minutes_before' => 30]);
    TaskReminder::factory()->for($task)->create(['minutes_before' => 60]);

    $this->actingAs($user)
        ->putJson(route('tasks.reminders.sync', $task), ['reminders' => [5]])
        ->assertSuccessful();

    expect($task->reminders()->count())->toBe(1);
    expect($task->reminders()->first()->minutes_before)->toBe(5);
});

test('can clear all reminders', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->scheduled()->create();

    TaskReminder::factory()->for($task)->create(['minutes_before' => 15]);

    $this->actingAs($user)
        ->putJson(route('tasks.reminders.sync', $task), ['reminders' => []])
        ->assertSuccessful();

    expect($task->reminders()->count())->toBe(0);
});

test('rejects duplicate reminder intervals', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->scheduled()->create();

    $this->actingAs($user)
        ->putJson(route('tasks.reminders.sync', $task), ['reminders' => [5, 5]])
        ->assertUnprocessable();
});

test('rejects invalid reminder intervals', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->scheduled()->create();

    $this->actingAs($user)
        ->putJson(route('tasks.reminders.sync', $task), ['reminders' => [10]])
        ->assertUnprocessable();
});

test('cannot sync reminders for another user task', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $task = Task::factory()->for($otherUser)->scheduled()->create();

    $this->actingAs($user)
        ->putJson(route('tasks.reminders.sync', $task), ['reminders' => [5]])
        ->assertForbidden();
});

test('reminders are deleted when task is unscheduled', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->scheduled()->create();

    TaskReminder::factory()->for($task)->create(['minutes_before' => 5]);
    TaskReminder::factory()->for($task)->create(['minutes_before' => 15]);

    $this->actingAs($user)
        ->patch(route('tasks.unschedule', $task))
        ->assertRedirect();

    expect($task->reminders()->count())->toBe(0);
});

test('reminders are deleted when task is completed', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->scheduled()->create();

    TaskReminder::factory()->for($task)->create(['minutes_before' => 30]);

    $this->actingAs($user)
        ->patch(route('tasks.update', $task), ['is_completed' => true])
        ->assertRedirect();

    expect($task->reminders()->count())->toBe(0);
});

test('notifications are cleared when task is unscheduled', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->scheduled()->create();

    $user->notify(new TaskReminderNotification($task, 5));

    expect($user->unreadNotifications()->count())->toBe(1);

    $this->actingAs($user)
        ->patch(route('tasks.unschedule', $task))
        ->assertRedirect();

    expect($user->fresh()->unreadNotifications()->count())->toBe(0);
});

test('notifications are cleared when task is completed', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->scheduled()->create();

    $user->notify(new TaskReminderNotification($task, 5));

    $this->actingAs($user)
        ->patch(route('tasks.update', $task), ['is_completed' => true])
        ->assertRedirect();

    expect($user->fresh()->unreadNotifications()->count())->toBe(0);
});

test('notifications are cleared when task is deleted', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->scheduled()->create();

    $user->notify(new TaskReminderNotification($task, 5));

    $this->actingAs($user)
        ->delete(route('tasks.destroy', $task))
        ->assertRedirect();

    expect($user->fresh()->unreadNotifications()->count())->toBe(0);
});

test('rearming reminders resets notified_at', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->scheduled()->create();

    $reminder = TaskReminder::factory()->for($task)->notified()->create(['minutes_before' => 5]);

    $this->actingAs($user)
        ->patchJson(route('tasks.reminders.rearm', $task))
        ->assertSuccessful();

    expect($reminder->fresh()->notified_at)->toBeNull();
});

test('cannot rearm reminders for another user task', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $task = Task::factory()->for($otherUser)->scheduled()->create();

    TaskReminder::factory()->for($task)->notified()->create(['minutes_before' => 5]);

    $this->actingAs($user)
        ->patchJson(route('tasks.reminders.rearm', $task))
        ->assertForbidden();
});

test('rescheduling does not automatically reset notified_at', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->scheduled()->create();

    $reminder = TaskReminder::factory()->for($task)->notified()->create(['minutes_before' => 5]);

    $this->actingAs($user)
        ->patch(route('tasks.schedule', $task), ['scheduled_at' => now()->addDay()->toISOString()])
        ->assertRedirect();

    expect($reminder->fresh()->notified_at)->not->toBeNull();
});

test('reminders cascade when task is deleted', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->scheduled()->create();

    TaskReminder::factory()->for($task)->create(['minutes_before' => 15]);

    $this->actingAs($user)
        ->delete(route('tasks.destroy', $task))
        ->assertRedirect();

    expect(TaskReminder::count())->toBe(0);
});
