<?php

use App\Models\Task;
use App\Models\TaskReminder;
use App\Models\User;
use App\Notifications\TaskReminderNotification;
use Illuminate\Support\Facades\Notification;

test('sends notification for due reminder', function () {
    Notification::fake();

    $user = User::factory()->create();
    $task = Task::factory()->for($user)->create([
        'scheduled_at' => now()->addMinutes(3),
    ]);

    TaskReminder::factory()->for($task)->create(['minutes_before' => 5]);

    $this->artisan('reminders:send')->assertSuccessful();

    Notification::assertSentTo($user, TaskReminderNotification::class, function ($notification) use ($task) {
        return $notification->task->id === $task->id && $notification->minutesBefore === 5;
    });
});

test('does not send notification for future reminder', function () {
    Notification::fake();

    $user = User::factory()->create();
    $task = Task::factory()->for($user)->create([
        'scheduled_at' => now()->addMinutes(30),
    ]);

    TaskReminder::factory()->for($task)->create(['minutes_before' => 5]);

    $this->artisan('reminders:send')->assertSuccessful();

    Notification::assertNothingSent();
});

test('does not send already-notified reminder', function () {
    Notification::fake();

    $user = User::factory()->create();
    $task = Task::factory()->for($user)->create([
        'scheduled_at' => now()->addMinutes(3),
    ]);

    TaskReminder::factory()->for($task)->notified()->create(['minutes_before' => 5]);

    $this->artisan('reminders:send')->assertSuccessful();

    Notification::assertNothingSent();
});

test('does not send reminder for completed task', function () {
    Notification::fake();

    $user = User::factory()->create();
    $task = Task::factory()->for($user)->completed()->create([
        'scheduled_at' => now()->addMinutes(3),
    ]);

    TaskReminder::factory()->for($task)->create(['minutes_before' => 5]);

    $this->artisan('reminders:send')->assertSuccessful();

    Notification::assertNothingSent();
});

test('does not send reminder for unscheduled task', function () {
    Notification::fake();

    $user = User::factory()->create();
    $task = Task::factory()->for($user)->create([
        'scheduled_at' => null,
    ]);

    TaskReminder::factory()->for($task)->create(['minutes_before' => 5]);

    $this->artisan('reminders:send')->assertSuccessful();

    Notification::assertNothingSent();
});

test('marks reminder as notified after sending', function () {
    Notification::fake();

    $user = User::factory()->create();
    $task = Task::factory()->for($user)->create([
        'scheduled_at' => now()->addMinutes(3),
    ]);

    $reminder = TaskReminder::factory()->for($task)->create(['minutes_before' => 5]);

    $this->artisan('reminders:send')->assertSuccessful();

    expect($reminder->fresh()->notified_at)->not->toBeNull();
});
