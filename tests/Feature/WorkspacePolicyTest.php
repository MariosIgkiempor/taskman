<?php

use App\Enums\WorkspaceRole;
use App\Models\User;
use App\Models\Workspace;

test('owner can view workspace', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Owner)
        ->create(['owner_id' => $user->id]);

    expect($user->can('view', $workspace))->toBeTrue();
});

test('admin can view workspace', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Admin)
        ->create();

    expect($user->can('view', $workspace))->toBeTrue();
});

test('member can view workspace', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Member)
        ->create();

    expect($user->can('view', $workspace))->toBeTrue();
});

test('non-member cannot view workspace', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()->create();

    expect($user->can('view', $workspace))->toBeFalse();
});

test('owner can update workspace', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Owner)
        ->create(['owner_id' => $user->id]);

    expect($user->can('update', $workspace))->toBeTrue();
});

test('admin can update workspace', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Admin)
        ->create();

    expect($user->can('update', $workspace))->toBeTrue();
});

test('member cannot update workspace', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Member)
        ->create();

    expect($user->can('update', $workspace))->toBeFalse();
});

test('owner can delete non-personal workspace', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Owner)
        ->create(['owner_id' => $user->id]);

    expect($user->can('delete', $workspace))->toBeTrue();
});

test('owner cannot delete personal workspace', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()->personal()
        ->withMember($user, WorkspaceRole::Owner)
        ->create(['owner_id' => $user->id]);

    expect($user->can('delete', $workspace))->toBeFalse();
});

test('admin cannot delete workspace', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Admin)
        ->create();

    expect($user->can('delete', $workspace))->toBeFalse();
});

test('member cannot delete workspace', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Member)
        ->create();

    expect($user->can('delete', $workspace))->toBeFalse();
});

test('owner can manage members on non-personal workspace', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Owner)
        ->create(['owner_id' => $user->id]);

    expect($user->can('manageMembers', $workspace))->toBeTrue();
});

test('admin can manage members on non-personal workspace', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Admin)
        ->create();

    expect($user->can('manageMembers', $workspace))->toBeTrue();
});

test('member cannot manage members', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Member)
        ->create();

    expect($user->can('manageMembers', $workspace))->toBeFalse();
});

test('cannot manage members on personal workspace', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()->personal()
        ->withMember($user, WorkspaceRole::Owner)
        ->create(['owner_id' => $user->id]);

    expect($user->can('manageMembers', $workspace))->toBeFalse();
});

test('owner can create invite on non-personal workspace', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Owner)
        ->create(['owner_id' => $user->id]);

    expect($user->can('createInvite', $workspace))->toBeTrue();
});

test('cannot create invite on personal workspace', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()->personal()
        ->withMember($user, WorkspaceRole::Owner)
        ->create(['owner_id' => $user->id]);

    expect($user->can('createInvite', $workspace))->toBeFalse();
});
