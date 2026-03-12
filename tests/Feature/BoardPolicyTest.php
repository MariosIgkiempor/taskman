<?php

use App\Enums\WorkspaceRole;
use App\Models\Board;
use App\Models\User;
use App\Models\Workspace;

test('any member can view board', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Member)
        ->create();
    $board = Board::factory()->for($workspace)->create();

    expect($user->can('view', $board))->toBeTrue();
});

test('non-member cannot view board', function () {
    $user = User::factory()->create();
    $board = Board::factory()->create();

    expect($user->can('view', $board))->toBeFalse();
});

test('owner can create board', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Owner)
        ->create(['owner_id' => $user->id]);

    expect($user->can('create', [Board::class, $workspace]))->toBeTrue();
});

test('admin can create board', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Admin)
        ->create();

    expect($user->can('create', [Board::class, $workspace]))->toBeTrue();
});

test('member cannot create board', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Member)
        ->create();

    expect($user->can('create', [Board::class, $workspace]))->toBeFalse();
});

test('owner can update board', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Owner)
        ->create(['owner_id' => $user->id]);
    $board = Board::factory()->for($workspace)->create();

    expect($user->can('update', $board))->toBeTrue();
});

test('member cannot update board', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Member)
        ->create();
    $board = Board::factory()->for($workspace)->create();

    expect($user->can('update', $board))->toBeFalse();
});

test('owner can delete board', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Owner)
        ->create(['owner_id' => $user->id]);
    $board = Board::factory()->for($workspace)->create();

    expect($user->can('delete', $board))->toBeTrue();
});

test('member cannot delete board', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Member)
        ->create();
    $board = Board::factory()->for($workspace)->create();

    expect($user->can('delete', $board))->toBeFalse();
});
