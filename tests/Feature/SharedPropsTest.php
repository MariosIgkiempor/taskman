<?php

declare(strict_types=1);

use App\Enums\WorkspaceRole;
use App\Models\Board;
use App\Models\Task;
use App\Models\Workspace;

test('shared workspaces prop includes open task counts', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();

    Task::factory(3)->for($user)->for($board)->create();
    Task::factory(2)->for($user)->for($board)->completed()->create();

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('workspaces.0.open_tasks_count', 3)
        );
});

test('shared workspaces prop excludes completed tasks from open count', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();

    Task::factory(5)->for($user)->for($board)->completed()->create();

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('workspaces.0.open_tasks_count', 0)
        );
});

test('shared workspaces prop has independent counts per workspace', function () {
    $user = createUserWithWorkspace();
    $personalBoard = $user->personalWorkspace->boards()->first();

    Task::factory(2)->for($user)->for($personalBoard)->create();

    $teamWorkspace = Workspace::factory()->create(['owner_id' => $user->id]);
    $teamWorkspace->members()->attach($user, ['role' => WorkspaceRole::Owner->value]);
    $teamBoard = Board::factory()->for($teamWorkspace)->create();

    Task::factory(4)->for($user)->for($teamBoard)->create();

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('workspaces.0.open_tasks_count', 2)  // personal first
            ->where('workspaces.1.open_tasks_count', 4)
        );
});
