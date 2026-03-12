<?php

use App\Enums\WorkspaceRole;
use App\Models\Board;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;

test('any workspace member can view task', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Member)
        ->create();
    $board = Board::factory()->for($workspace)->create();
    $task = Task::factory()->for($board)->create();

    expect($user->can('view', $task))->toBeTrue();
});

test('any workspace member can update task', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Member)
        ->create();
    $board = Board::factory()->for($workspace)->create();
    $task = Task::factory()->for($board)->create();

    expect($user->can('update', $task))->toBeTrue();
});

test('any workspace member can delete task', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Member)
        ->create();
    $board = Board::factory()->for($workspace)->create();
    $task = Task::factory()->for($board)->create();

    expect($user->can('delete', $task))->toBeTrue();
});

test('non-member cannot view task', function () {
    $user = User::factory()->create();
    $task = Task::factory()->create();

    expect($user->can('view', $task))->toBeFalse();
});

test('non-member cannot update task', function () {
    $user = User::factory()->create();
    $task = Task::factory()->create();

    expect($user->can('update', $task))->toBeFalse();
});

test('non-member cannot delete task', function () {
    $user = User::factory()->create();
    $task = Task::factory()->create();

    expect($user->can('delete', $task))->toBeFalse();
});
