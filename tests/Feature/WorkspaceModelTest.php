<?php

use App\Enums\WorkspaceRole;
use App\Models\Board;
use App\Models\Tag;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceInvite;

test('workspace factory creates valid model', function () {
    $workspace = Workspace::factory()->create();

    expect($workspace)->toBeInstanceOf(Workspace::class);
    expect($workspace->name)->toBeString();
    expect($workspace->is_personal)->toBeFalse();
    expect($workspace->owner)->toBeInstanceOf(User::class);
});

test('workspace personal state sets is_personal', function () {
    $workspace = Workspace::factory()->personal()->create();

    expect($workspace->is_personal)->toBeTrue();
});

test('workspace has owner relationship', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()->create(['owner_id' => $user->id]);

    expect($workspace->owner->id)->toBe($user->id);
});

test('workspace has members relationship with pivot role', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()->create();
    $workspace->members()->attach($user, ['role' => WorkspaceRole::Admin->value]);

    $member = $workspace->members()->first();
    expect($member->id)->toBe($user->id);
    expect($member->pivot->role)->toBe(WorkspaceRole::Admin->value);
});

test('workspace has boards relationship', function () {
    $workspace = Workspace::factory()->create();
    Board::factory()->for($workspace)->count(2)->create();

    expect($workspace->boards)->toHaveCount(2);
});

test('workspace has tags relationship', function () {
    $workspace = Workspace::factory()->create();
    Tag::factory()->for($workspace)->count(3)->create();

    expect($workspace->tags)->toHaveCount(3);
});

test('workspace has invites relationship', function () {
    $workspace = Workspace::factory()->create();
    WorkspaceInvite::factory()->for($workspace)->create();

    expect($workspace->invites)->toHaveCount(1);
});

test('workspace has tasks through boards', function () {
    $workspace = Workspace::factory()->create();
    $board = Board::factory()->for($workspace)->create();
    Task::factory()->for($board)->count(2)->create();

    expect($workspace->tasks)->toHaveCount(2);
});

test('workspace roleFor returns correct role', function () {
    $owner = User::factory()->create();
    $admin = User::factory()->create();
    $member = User::factory()->create();
    $outsider = User::factory()->create();

    $workspace = Workspace::factory()->create(['owner_id' => $owner->id]);
    $workspace->members()->attach($owner, ['role' => WorkspaceRole::Owner->value]);
    $workspace->members()->attach($admin, ['role' => WorkspaceRole::Admin->value]);
    $workspace->members()->attach($member, ['role' => WorkspaceRole::Member->value]);

    expect($workspace->roleFor($owner))->toBe(WorkspaceRole::Owner);
    expect($workspace->roleFor($admin))->toBe(WorkspaceRole::Admin);
    expect($workspace->roleFor($member))->toBe(WorkspaceRole::Member);
    expect($workspace->roleFor($outsider))->toBeNull();
});

test('user has workspaces relationship', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()->create();
    $workspace->members()->attach($user, ['role' => WorkspaceRole::Member->value]);

    expect($user->workspaces)->toHaveCount(1);
});

test('user has ownedWorkspaces relationship', function () {
    $user = User::factory()->create();
    Workspace::factory()->count(2)->create(['owner_id' => $user->id]);

    expect($user->ownedWorkspaces)->toHaveCount(2);
});

test('user has personalWorkspace relationship', function () {
    $user = createUserWithWorkspace();

    expect($user->personalWorkspace)->toBeInstanceOf(Workspace::class);
    expect($user->personalWorkspace->is_personal)->toBeTrue();
});

test('withPersonalWorkspace factory creates workspace board and pivot', function () {
    $user = createUserWithWorkspace();

    expect($user->personalWorkspace)->not->toBeNull();
    expect($user->personalWorkspace->boards)->toHaveCount(1);
    expect($user->personalWorkspace->boards->first()->name)->toBe('My Tasks');
    expect($user->personalWorkspace->members)->toHaveCount(1);
    expect($user->personalWorkspace->members->first()->pivot->role)->toBe(WorkspaceRole::Owner->value);
});

test('withMember factory state attaches member', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()->withMember($user, WorkspaceRole::Admin)->create();

    expect($workspace->members)->toHaveCount(1);
    expect($workspace->roleFor($user))->toBe(WorkspaceRole::Admin);
});
