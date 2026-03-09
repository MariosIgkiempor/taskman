<?php

use App\Models\Task;
use App\Models\User;

test('guests are redirected from tasks page', function () {
    $this->get(route('tasks.index'))->assertRedirect(route('login'));
});

test('authenticated users can view tasks page', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('tasks.index'))
        ->assertOk();
});

test('can create a task', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->post(route('tasks.store'), ['title' => 'My new task']);

    $response->assertRedirect();

    expect($user->tasks()->count())->toBe(1);
    expect($user->tasks()->first()->title)->toBe('My new task');
});

test('creating a task requires a title', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('tasks.store'), ['title' => ''])
        ->assertSessionHasErrors('title');
});

test('can update a task', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->create();

    $this->actingAs($user)
        ->patch(route('tasks.update', $task), ['title' => 'Updated title'])
        ->assertRedirect();

    expect($task->fresh()->title)->toBe('Updated title');
});

test('can schedule a task', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->create();

    $scheduledAt = now()->addDay()->setHour(10)->setMinute(0)->setSecond(0)->toISOString();

    $this->actingAs($user)
        ->patch(route('tasks.schedule', $task), ['scheduled_at' => $scheduledAt])
        ->assertRedirect();

    expect($task->fresh()->scheduled_at)->not->toBeNull();
});

test('can unschedule a task', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->scheduled()->create();

    $this->actingAs($user)
        ->patch(route('tasks.unschedule', $task))
        ->assertRedirect();

    expect($task->fresh()->scheduled_at)->toBeNull();
});

test('can toggle task completion', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->create();

    $this->actingAs($user)
        ->patch(route('tasks.update', $task), ['is_completed' => true])
        ->assertRedirect();

    expect($task->fresh()->is_completed)->toBeTrue();

    $this->actingAs($user)
        ->patch(route('tasks.update', $task), ['is_completed' => false])
        ->assertRedirect();

    expect($task->fresh()->is_completed)->toBeFalse();
});

test('can delete a task', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->create();

    $this->actingAs($user)
        ->delete(route('tasks.destroy', $task))
        ->assertRedirect();

    expect($task->fresh())->toBeNull();
});

test('cannot modify another user task', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $task = Task::factory()->for($otherUser)->create();

    $this->actingAs($user)
        ->patch(route('tasks.update', $task), ['title' => 'Hacked'])
        ->assertForbidden();

    $this->actingAs($user)
        ->patch(route('tasks.schedule', $task), ['scheduled_at' => now()->toISOString()])
        ->assertForbidden();

    $this->actingAs($user)
        ->patch(route('tasks.unschedule', $task))
        ->assertForbidden();

    $this->actingAs($user)
        ->delete(route('tasks.destroy', $task))
        ->assertForbidden();
});

test('can resize a task to change its duration', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->scheduled()->create();

    $this->actingAs($user)
        ->patch(route('tasks.schedule', $task), [
            'scheduled_at' => $task->scheduled_at->toISOString(),
            'duration_minutes' => 90,
        ])
        ->assertRedirect();

    expect($task->fresh()->duration_minutes)->toBe(90);
});

test('duration must be at least 5 minutes', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->scheduled()->create();

    $this->actingAs($user)
        ->patch(route('tasks.schedule', $task), [
            'scheduled_at' => $task->scheduled_at->toISOString(),
            'duration_minutes' => 3,
        ])
        ->assertSessionHasErrors('duration_minutes');
});

test('index with week param returns tasks for that specific week', function () {
    $user = User::factory()->create();

    $targetWeekStart = now()->subWeeks(2)->startOfWeek();

    Task::factory()->for($user)->create([
        'scheduled_at' => $targetWeekStart->copy()->addDay()->setHour(10),
    ]);

    Task::factory()->for($user)->create([
        'scheduled_at' => now()->startOfWeek()->addDay()->setHour(10),
    ]);

    $response = $this->actingAs($user)
        ->get(route('tasks.index', ['week' => $targetWeekStart->toDateString()]))
        ->assertOk();

    $props = $response->original->getData()['page']['props'];

    expect($props['scheduledTasks'])->toHaveCount(1);
    expect($props['currentWeekStart'])->toMatch('/^\d{4}-\d{2}-\d{2}$/');
});

test('index with invalid week param returns validation error', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('tasks.index', ['week' => 'not-a-date']))
        ->assertRedirect();
});

test('index returns separated unscheduled and scheduled tasks', function () {
    $user = User::factory()->create();

    Task::factory()->for($user)->count(2)->create();

    $thisWeek = now()->startOfWeek()->addDay()->setHour(10);
    Task::factory()->for($user)->count(3)->create([
        'scheduled_at' => $thisWeek,
    ]);

    $response = $this->actingAs($user)
        ->get(route('tasks.index'))
        ->assertOk();

    $props = $response->original->getData()['page']['props'];

    expect($props['unscheduledTasks'])->toHaveCount(2);
    expect($props['scheduledTasks'])->toHaveCount(3);
});
