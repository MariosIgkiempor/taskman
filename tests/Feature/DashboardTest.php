<?php

use App\Enums\WorkspaceRole;
use App\Models\Board;
use App\Models\Task;
use App\Models\Workspace;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = createUserWithWorkspace();

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('dashboard'));
});

test('dashboard shows correct summary counts', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();

    // 3 open tasks
    Task::factory(3)->for($user)->for($board)->create();

    // 2 completed tasks
    Task::factory(2)->for($user)->for($board)->completed()->create();

    // 1 overdue task
    Task::factory()->for($user)->for($board)->create([
        'scheduled_at' => now()->subDay(),
    ]);

    // 1 upcoming task (within 7 days)
    Task::factory()->for($user)->for($board)->create([
        'scheduled_at' => now()->addDays(2),
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('summary.totalTasks', 5) // 3 open + 1 overdue + 1 upcoming
            ->where('summary.completedTasks', 2)
            ->where('summary.overdueTasks', 1)
            ->where('summary.upcomingTasks', 1)
        );
});

test('dashboard shows upcoming tasks', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();

    Task::factory()->for($user)->for($board)->create([
        'title' => 'Future task',
        'scheduled_at' => now()->addDays(3),
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('upcomingTasks', 1)
            ->where('upcomingTasks.0.title', 'Future task')
        );
});

test('dashboard shows overdue tasks', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();

    Task::factory()->for($user)->for($board)->create([
        'title' => 'Past due task',
        'scheduled_at' => now()->subHours(2),
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('overdueTasks', 1)
            ->where('overdueTasks.0.title', 'Past due task')
        );
});

test('dashboard only shows tasks from user workspaces', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();

    Task::factory()->for($user)->for($board)->create(['title' => 'My task']);

    // Another user's task in a workspace this user does NOT belong to
    $otherUser = createUserWithWorkspace();
    $otherBoard = $otherUser->personalWorkspace->boards()->first();
    Task::factory()->for($otherUser)->for($otherBoard)->create(['title' => 'Other task']);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('summary.totalTasks', 1)
        );
});

test('dashboard shows workspace breakdowns', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();

    Task::factory(2)->for($user)->for($board)->create();
    Task::factory()->for($user)->for($board)->completed()->create();

    // Second workspace
    $workspace2 = Workspace::factory()->create(['owner_id' => $user->id]);
    $workspace2->members()->attach($user, ['role' => WorkspaceRole::Owner->value]);
    $board2 = Board::factory()->for($workspace2)->create();

    Task::factory()->for($user)->for($board2)->create();

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('workspaceBreakdowns', 2)
        );
});

test('dashboard shows recently completed tasks', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();

    Task::factory()->for($user)->for($board)->completed()->create([
        'title' => 'Done task',
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('recentlyCompleted', 1)
            ->where('recentlyCompleted.0.title', 'Done task')
        );
});
