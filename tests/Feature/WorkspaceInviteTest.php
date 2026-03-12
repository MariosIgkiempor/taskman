<?php

use App\Enums\WorkspaceRole;
use App\Models\Workspace;
use App\Models\WorkspaceInvite;

test('owner can create invite', function () {
    $owner = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->create(['owner_id' => $owner->id]);

    $this->actingAs($owner)
        ->post(route('workspaces.invites.store', $workspace))
        ->assertRedirect();

    expect($workspace->invites()->count())->toBe(1);
    expect($workspace->invites()->first()->token)->not->toBeNull();
});

test('admin can create invite', function () {
    $owner = createUserWithWorkspace();
    $admin = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->withMember($admin, WorkspaceRole::Admin)
        ->create(['owner_id' => $owner->id]);

    $this->actingAs($admin)
        ->post(route('workspaces.invites.store', $workspace))
        ->assertRedirect();

    expect($workspace->invites()->count())->toBe(1);
});

test('member cannot create invite', function () {
    $owner = createUserWithWorkspace();
    $member = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->withMember($member, WorkspaceRole::Member)
        ->create(['owner_id' => $owner->id]);

    $this->actingAs($member)
        ->post(route('workspaces.invites.store', $workspace))
        ->assertForbidden();
});

test('cannot create invite for personal workspace', function () {
    $owner = createUserWithWorkspace();

    $this->actingAs($owner)
        ->post(route('workspaces.invites.store', $owner->personalWorkspace))
        ->assertForbidden();
});

test('authenticated user can accept invite', function () {
    $owner = createUserWithWorkspace();
    $invitee = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->create(['owner_id' => $owner->id]);
    $invite = WorkspaceInvite::factory()->for($workspace)->create(['created_by' => $owner->id]);

    $this->actingAs($invitee)
        ->get(route('workspaces.invites.accept', $invite->token))
        ->assertRedirect(route('tasks.index', $workspace));

    expect($workspace->members()->where('user_id', $invitee->id)->exists())->toBeTrue();
    expect($workspace->roleFor($invitee))->toBe(WorkspaceRole::Member);
});

test('accepting expired invite fails', function () {
    $owner = createUserWithWorkspace();
    $invitee = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->create(['owner_id' => $owner->id]);
    $invite = WorkspaceInvite::factory()->for($workspace)->create([
        'created_by' => $owner->id,
        'expires_at' => now()->subDay(),
    ]);

    $this->actingAs($invitee)
        ->get(route('workspaces.invites.accept', $invite->token))
        ->assertGone();
});

test('accepting invite when already member does not duplicate', function () {
    $owner = createUserWithWorkspace();
    $member = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->withMember($member, WorkspaceRole::Member)
        ->create(['owner_id' => $owner->id]);
    $invite = WorkspaceInvite::factory()->for($workspace)->create(['created_by' => $owner->id]);

    $this->actingAs($member)
        ->get(route('workspaces.invites.accept', $invite->token))
        ->assertRedirect(route('tasks.index', $workspace));

    expect($workspace->members()->where('user_id', $member->id)->count())->toBe(1);
});

test('unauthenticated user redirected to login on accept', function () {
    $owner = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->create(['owner_id' => $owner->id]);
    $invite = WorkspaceInvite::factory()->for($workspace)->create(['created_by' => $owner->id]);

    $this->get(route('workspaces.invites.accept', $invite->token))
        ->assertRedirect(route('login'));
});

test('owner can revoke invite', function () {
    $owner = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->create(['owner_id' => $owner->id]);
    $invite = WorkspaceInvite::factory()->for($workspace)->create(['created_by' => $owner->id]);

    $this->actingAs($owner)
        ->delete(route('workspaces.invites.destroy', $invite))
        ->assertRedirect();

    expect($invite->fresh())->toBeNull();
});

test('member cannot revoke invite', function () {
    $owner = createUserWithWorkspace();
    $member = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->withMember($member, WorkspaceRole::Member)
        ->create(['owner_id' => $owner->id]);
    $invite = WorkspaceInvite::factory()->for($workspace)->create(['created_by' => $owner->id]);

    $this->actingAs($member)
        ->delete(route('workspaces.invites.destroy', $invite))
        ->assertForbidden();
});
