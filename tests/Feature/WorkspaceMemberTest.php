<?php

use App\Enums\WorkspaceRole;
use App\Models\Workspace;

test('member of workspace can list members', function () {
    $owner = createUserWithWorkspace();
    $member = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->withMember($member, WorkspaceRole::Member)
        ->create(['owner_id' => $owner->id]);

    $this->actingAs($owner)
        ->getJson(route('workspaces.members.index', $workspace))
        ->assertOk()
        ->assertJsonCount(2);
});

test('non-member cannot list members', function () {
    $owner = createUserWithWorkspace();
    $nonMember = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->create(['owner_id' => $owner->id]);

    $this->actingAs($nonMember)
        ->getJson(route('workspaces.members.index', $workspace))
        ->assertForbidden();
});

test('owner can update member role to admin', function () {
    $owner = createUserWithWorkspace();
    $member = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->withMember($member, WorkspaceRole::Member)
        ->create(['owner_id' => $owner->id]);

    $this->actingAs($owner)
        ->patch(route('workspaces.members.update', [$workspace, $member]), ['role' => 'admin'])
        ->assertRedirect();

    expect($workspace->roleFor($member))->toBe(WorkspaceRole::Admin);
});

test('admin can update member role', function () {
    $owner = createUserWithWorkspace();
    $admin = createUserWithWorkspace();
    $member = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->withMember($admin, WorkspaceRole::Admin)
        ->withMember($member, WorkspaceRole::Member)
        ->create(['owner_id' => $owner->id]);

    $this->actingAs($admin)
        ->patch(route('workspaces.members.update', [$workspace, $member]), ['role' => 'admin'])
        ->assertRedirect();

    expect($workspace->roleFor($member))->toBe(WorkspaceRole::Admin);
});

test('member cannot update roles', function () {
    $owner = createUserWithWorkspace();
    $member = createUserWithWorkspace();
    $otherMember = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->withMember($member, WorkspaceRole::Member)
        ->withMember($otherMember, WorkspaceRole::Member)
        ->create(['owner_id' => $owner->id]);

    $this->actingAs($member)
        ->patch(route('workspaces.members.update', [$workspace, $otherMember]), ['role' => 'admin'])
        ->assertForbidden();
});

test('cannot change owner role', function () {
    $owner = createUserWithWorkspace();
    $admin = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->withMember($admin, WorkspaceRole::Admin)
        ->create(['owner_id' => $owner->id]);

    $this->actingAs($admin)
        ->patch(route('workspaces.members.update', [$workspace, $owner]), ['role' => 'member'])
        ->assertForbidden();
});

test('role must be valid', function () {
    $owner = createUserWithWorkspace();
    $member = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->withMember($member, WorkspaceRole::Member)
        ->create(['owner_id' => $owner->id]);

    $this->actingAs($owner)
        ->patch(route('workspaces.members.update', [$workspace, $member]), ['role' => 'superadmin'])
        ->assertSessionHasErrors('role');
});

test('owner can remove member', function () {
    $owner = createUserWithWorkspace();
    $member = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->withMember($member, WorkspaceRole::Member)
        ->create(['owner_id' => $owner->id]);

    $this->actingAs($owner)
        ->delete(route('workspaces.members.destroy', [$workspace, $member]))
        ->assertRedirect();

    expect($workspace->members()->where('user_id', $member->id)->exists())->toBeFalse();
});

test('cannot remove owner', function () {
    $owner = createUserWithWorkspace();
    $admin = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->withMember($admin, WorkspaceRole::Admin)
        ->create(['owner_id' => $owner->id]);

    $this->actingAs($admin)
        ->delete(route('workspaces.members.destroy', [$workspace, $owner]))
        ->assertForbidden();
});

test('cannot remove from personal workspace', function () {
    $owner = createUserWithWorkspace();
    $workspace = $owner->personalWorkspace;

    $this->actingAs($owner)
        ->delete(route('workspaces.members.destroy', [$workspace, $owner]))
        ->assertForbidden();
});

test('member can remove themselves', function () {
    $owner = createUserWithWorkspace();
    $member = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->withMember($member, WorkspaceRole::Member)
        ->create(['owner_id' => $owner->id]);

    $this->actingAs($member)
        ->delete(route('workspaces.members.destroy', [$workspace, $member]))
        ->assertRedirect(route('tasks.index', $member->personalWorkspace));

    expect($workspace->members()->where('user_id', $member->id)->exists())->toBeFalse();
});

test('member cannot remove others', function () {
    $owner = createUserWithWorkspace();
    $member = createUserWithWorkspace();
    $otherMember = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->withMember($member, WorkspaceRole::Member)
        ->withMember($otherMember, WorkspaceRole::Member)
        ->create(['owner_id' => $owner->id]);

    $this->actingAs($member)
        ->delete(route('workspaces.members.destroy', [$workspace, $otherMember]))
        ->assertForbidden();
});
