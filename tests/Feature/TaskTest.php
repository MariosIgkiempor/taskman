<?php

use App\Models\Tag;
use App\Models\Task;

test('guests are redirected from tasks page', function () {
    $workspace = App\Models\Workspace::factory()->create();

    $this->get(route('tasks.index', $workspace))->assertRedirect(route('login'));
});

test('authenticated users can view tasks page', function () {
    $user = createUserWithWorkspace();

    $this->actingAs($user)
        ->get(route('tasks.index', $user->personalWorkspace))
        ->assertOk();
});

test('can create a task', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();

    $response = $this->actingAs($user)
        ->post(route('tasks.store', $user->personalWorkspace), [
            'title' => 'My new task',
            'board_id' => $board->id,
        ]);

    $response->assertRedirect();

    expect($user->tasks()->count())->toBe(1);
    expect($user->tasks()->first()->title)->toBe('My new task');
});

test('creating a task requires a title', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();

    $this->actingAs($user)
        ->post(route('tasks.store', $user->personalWorkspace), [
            'title' => '',
            'board_id' => $board->id,
        ])
        ->assertSessionHasErrors('title');
});

test('can update a task', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();
    $task = Task::factory()->for($user)->for($board)->create();

    $this->actingAs($user)
        ->patch(route('tasks.update', $task), ['title' => 'Updated title'])
        ->assertRedirect();

    expect($task->fresh()->title)->toBe('Updated title');
});

test('can schedule a task', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();
    $task = Task::factory()->for($user)->for($board)->create();

    $scheduledAt = now()->addDay()->setHour(10)->setMinute(0)->setSecond(0)->toISOString();

    $this->actingAs($user)
        ->patch(route('tasks.schedule', $task), ['scheduled_at' => $scheduledAt])
        ->assertRedirect();

    expect($task->fresh()->scheduled_at)->not->toBeNull();
});

test('can unschedule a task', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();
    $task = Task::factory()->for($user)->for($board)->scheduled()->create();

    $this->actingAs($user)
        ->patch(route('tasks.unschedule', $task))
        ->assertRedirect();

    expect($task->fresh()->scheduled_at)->toBeNull();
});

test('can toggle task completion', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();
    $task = Task::factory()->for($user)->for($board)->create();

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
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();
    $task = Task::factory()->for($user)->for($board)->create();

    $this->actingAs($user)
        ->delete(route('tasks.destroy', $task))
        ->assertRedirect();

    expect($task->fresh())->toBeNull();
});

test('cannot modify another user task', function () {
    $user = createUserWithWorkspace();
    $otherUser = createUserWithWorkspace();
    $otherBoard = $otherUser->personalWorkspace->boards()->first();
    $task = Task::factory()->for($otherUser)->for($otherBoard)->create();

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
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();
    $task = Task::factory()->for($user)->for($board)->scheduled()->create();

    $this->actingAs($user)
        ->patch(route('tasks.schedule', $task), [
            'scheduled_at' => $task->scheduled_at->toISOString(),
            'duration_minutes' => 90,
        ])
        ->assertRedirect();

    expect($task->fresh()->duration_minutes)->toBe(90);
});

test('can schedule an unscheduled task with date time and duration', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();
    $task = Task::factory()->for($user)->for($board)->create();

    $scheduledAt = now()->addDay()->setHour(14)->setMinute(30)->setSecond(0);

    $this->actingAs($user)
        ->patch(route('tasks.schedule', $task), [
            'scheduled_at' => $scheduledAt->toISOString(),
            'duration_minutes' => 45,
        ])
        ->assertRedirect();

    $fresh = $task->fresh();
    expect($fresh->scheduled_at)->not->toBeNull();
    expect($fresh->duration_minutes)->toBe(45);
});

test('can reschedule a task to a different date and time', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();
    $task = Task::factory()->for($user)->for($board)->scheduled()->create();

    $newScheduledAt = now()->addDays(3)->setHour(16)->setMinute(0)->setSecond(0);

    $this->actingAs($user)
        ->patch(route('tasks.schedule', $task), [
            'scheduled_at' => $newScheduledAt->toISOString(),
            'duration_minutes' => 120,
        ])
        ->assertRedirect();

    $fresh = $task->fresh();
    expect($fresh->scheduled_at->toDateString())->toBe($newScheduledAt->toDateString());
    expect($fresh->duration_minutes)->toBe(120);
});

test('duration must be at least 5 minutes', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();
    $task = Task::factory()->for($user)->for($board)->scheduled()->create();

    $this->actingAs($user)
        ->patch(route('tasks.schedule', $task), [
            'scheduled_at' => $task->scheduled_at->toISOString(),
            'duration_minutes' => 3,
        ])
        ->assertSessionHasErrors('duration_minutes');
});

test('index with week param returns tasks for that specific week', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();

    $targetWeekStart = now()->subWeeks(2)->startOfWeek();

    Task::factory()->for($user)->for($board)->create([
        'scheduled_at' => $targetWeekStart->copy()->addDay()->setHour(10),
    ]);

    Task::factory()->for($user)->for($board)->create([
        'scheduled_at' => now()->startOfWeek()->addDay()->setHour(10),
    ]);

    $response = $this->actingAs($user)
        ->get(route('tasks.index', ['workspace' => $user->personalWorkspace, 'week' => $targetWeekStart->toDateString()]))
        ->assertOk();

    $props = $response->original->getData()['page']['props'];

    expect($props['scheduledTasks'])->toHaveCount(1);
    expect($props['currentWeekStart'])->toMatch('/^\d{4}-\d{2}-\d{2}$/');
});

test('index with invalid week param returns validation error', function () {
    $user = createUserWithWorkspace();

    $this->actingAs($user)
        ->get(route('tasks.index', ['workspace' => $user->personalWorkspace, 'week' => 'not-a-date']))
        ->assertRedirect();
});

test('index returns scheduled tasks with their tags', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();
    $tag = Tag::factory()->for($user->personalWorkspace)->create();

    $thisWeek = now()->startOfWeek()->addDay()->setHour(10);
    $task = Task::factory()->for($user)->for($board)->create([
        'scheduled_at' => $thisWeek,
    ]);
    $task->tags()->attach($tag);

    $response = $this->actingAs($user)
        ->get(route('tasks.index', $user->personalWorkspace))
        ->assertOk();

    $props = $response->original->getData()['page']['props'];

    expect($props['scheduledTasks'])->toHaveCount(1);
    expect($props['scheduledTasks'][0]['tags'])->toHaveCount(1);
    expect($props['scheduledTasks'][0]['tags'][0]['id'])->toBe($tag->id);
});

test('can create a task with location', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();

    $this->actingAs($user)
        ->post(route('tasks.store', $user->personalWorkspace), [
            'title' => 'Meeting at office',
            'board_id' => $board->id,
            'location' => '123 Main St, New York, NY',
            'location_coordinates' => ['lat' => 40.7128, 'lng' => -74.0060],
        ])
        ->assertRedirect();

    $task = $user->tasks()->first();
    expect($task->location)->toBe('123 Main St, New York, NY');
    expect($task->location_coordinates)->toBe(['lat' => 40.7128, 'lng' => -74.006]);
});

test('can update a task with location', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();
    $task = Task::factory()->for($user)->for($board)->create();

    $this->actingAs($user)
        ->patch(route('tasks.update', $task), [
            'location' => '456 Oak Ave, Chicago, IL',
            'location_coordinates' => ['lat' => 41.8781, 'lng' => -87.6298],
        ])
        ->assertRedirect();

    $fresh = $task->fresh();
    expect($fresh->location)->toBe('456 Oak Ave, Chicago, IL');
    expect($fresh->location_coordinates)->toBe(['lat' => 41.8781, 'lng' => -87.6298]);
});

test('can clear task location', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();
    $task = Task::factory()->for($user)->for($board)->withLocation()->create();

    $this->actingAs($user)
        ->patch(route('tasks.update', $task), [
            'location' => null,
            'location_coordinates' => null,
        ])
        ->assertRedirect();

    $fresh = $task->fresh();
    expect($fresh->location)->toBeNull();
    expect($fresh->location_coordinates)->toBeNull();
});

test('location coordinates must have valid lat and lng', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();
    $task = Task::factory()->for($user)->for($board)->create();

    $this->actingAs($user)
        ->patch(route('tasks.update', $task), [
            'location_coordinates' => ['lat' => 100, 'lng' => -74.0060],
        ])
        ->assertSessionHasErrors('location_coordinates.lat');

    $this->actingAs($user)
        ->patch(route('tasks.update', $task), [
            'location_coordinates' => ['lat' => 40.7128, 'lng' => 200],
        ])
        ->assertSessionHasErrors('location_coordinates.lng');
});

test('index returns separated unscheduled and scheduled tasks', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();

    Task::factory()->for($user)->for($board)->count(2)->create();

    $thisWeek = now()->startOfWeek()->addDay()->setHour(10);
    Task::factory()->for($user)->for($board)->count(3)->create([
        'scheduled_at' => $thisWeek,
    ]);

    $response = $this->actingAs($user)
        ->get(route('tasks.index', $user->personalWorkspace))
        ->assertOk();

    $props = $response->original->getData()['page']['props'];

    expect($props['unscheduledTasks'])->toHaveCount(2);
    expect($props['scheduledTasks'])->toHaveCount(3);
    expect($props['completedTasks'])->toHaveCount(0);
});

test('completed tasks appear in completedTasks regardless of schedule status', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();

    // Incomplete unscheduled task
    Task::factory()->for($user)->for($board)->create();

    // Completed unscheduled task
    Task::factory()->for($user)->for($board)->create(['is_completed' => true]);

    // Completed scheduled task
    $thisWeek = now()->startOfWeek()->addDay()->setHour(10);
    Task::factory()->for($user)->for($board)->create([
        'scheduled_at' => $thisWeek,
        'is_completed' => true,
    ]);

    $response = $this->actingAs($user)
        ->get(route('tasks.index', $user->personalWorkspace))
        ->assertOk();

    $props = $response->original->getData()['page']['props'];

    expect($props['unscheduledTasks'])->toHaveCount(1);
    expect($props['completedTasks'])->toHaveCount(2);
});

test('can duplicate a task with all properties and tags', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();
    $tag = Tag::factory()->for($user->personalWorkspace)->create();
    $task = Task::factory()->for($user)->for($board)->scheduled()->withLocation()->create([
        'description' => 'Important meeting',
    ]);
    $task->tags()->attach($tag);

    $newScheduledAt = now()->addDays(2)->setHour(14)->setMinute(0)->setSecond(0)->toISOString();

    $this->actingAs($user)
        ->post(route('tasks.duplicate', $task), ['scheduled_at' => $newScheduledAt])
        ->assertRedirect();

    expect($user->tasks()->count())->toBe(2);

    $duplicate = $user->tasks()->where('id', '!=', $task->id)->first();
    expect($duplicate->title)->toBe($task->title);
    expect($duplicate->description)->toBe('Important meeting');
    expect($duplicate->duration_minutes)->toBe($task->duration_minutes);
    expect($duplicate->location)->toBe($task->location);
    expect($duplicate->location_coordinates)->toBe($task->location_coordinates);
    expect($duplicate->tags)->toHaveCount(1);
    expect($duplicate->tags->first()->id)->toBe($tag->id);
});

test('duplicated task starts as incomplete', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();
    $task = Task::factory()->for($user)->for($board)->scheduled()->completed()->create();

    $this->actingAs($user)
        ->post(route('tasks.duplicate', $task), ['scheduled_at' => now()->addDay()->toISOString()])
        ->assertRedirect();

    $duplicate = $user->tasks()->where('id', '!=', $task->id)->first();
    expect($duplicate->is_completed)->toBeFalse();
});

test('cannot duplicate another user task', function () {
    $user = createUserWithWorkspace();
    $otherUser = createUserWithWorkspace();
    $otherBoard = $otherUser->personalWorkspace->boards()->first();
    $task = Task::factory()->for($otherUser)->for($otherBoard)->scheduled()->create();

    $this->actingAs($user)
        ->post(route('tasks.duplicate', $task), ['scheduled_at' => now()->toISOString()])
        ->assertForbidden();
});

test('duplicate requires scheduled_at', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();
    $task = Task::factory()->for($user)->for($board)->scheduled()->create();

    $this->actingAs($user)
        ->post(route('tasks.duplicate', $task), [])
        ->assertSessionHasErrors('scheduled_at');
});

test('cannot access tasks index of workspace user is not a member of', function () {
    $user = createUserWithWorkspace();
    $otherUser = createUserWithWorkspace();

    $this->actingAs($user)
        ->get(route('tasks.index', $otherUser->personalWorkspace))
        ->assertForbidden();
});

test('task store rejects board_id from another workspace', function () {
    $user = createUserWithWorkspace();
    $otherUser = createUserWithWorkspace();
    $otherBoard = $otherUser->personalWorkspace->boards()->first();

    $this->actingAs($user)
        ->post(route('tasks.store', $user->personalWorkspace), [
            'title' => 'Cross-workspace task',
            'board_id' => $otherBoard->id,
        ])
        ->assertSessionHasErrors('board_id');
});

test('task store rejects tag_ids from another workspace', function () {
    $user = createUserWithWorkspace();
    $otherUser = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();
    $otherTag = Tag::factory()->for($otherUser->personalWorkspace)->create();

    $this->actingAs($user)
        ->post(route('tasks.store', $user->personalWorkspace), [
            'title' => 'Cross-workspace tag task',
            'board_id' => $board->id,
            'tag_ids' => [$otherTag->id],
        ])
        ->assertSessionHasErrors('tag_ids.0');
});
