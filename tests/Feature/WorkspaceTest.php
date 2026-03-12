<?php

use App\Enums\WorkspaceRole;
use App\Models\Workspace;

test('guests are redirected from workspaces index', function () {
    $this->get(route('workspaces.index'))->assertRedirect(route('login'));
});

test('authenticated user can view workspaces index', function () {
    $user = createUserWithWorkspace();

    $this->actingAs($user)
        ->get(route('workspaces.index'))
        ->assertOk();
});

test('can create a workspace', function () {
    $user = createUserWithWorkspace();

    $response = $this->actingAs($user)
        ->post(route('workspaces.store'), ['name' => 'Team Workspace']);

    $workspace = Workspace::where('name', 'Team Workspace')->first();

    expect($workspace)->not->toBeNull();
    expect($workspace->is_personal)->toBeFalse();
    expect($workspace->owner_id)->toBe($user->id);
    expect($workspace->members()->where('user_id', $user->id)->first()->pivot->role)->toBe(WorkspaceRole::Owner->value);
    expect($workspace->boards()->count())->toBe(1);
    expect($workspace->boards()->first()->name)->toBe('General');

    $response->assertRedirect(route('tasks.index', $workspace));
});

test('creating workspace requires name', function () {
    $user = createUserWithWorkspace();

    $this->actingAs($user)
        ->post(route('workspaces.store'), ['name' => ''])
        ->assertSessionHasErrors('name');
});

test('any member can view workspace settings', function () {
    $owner = createUserWithWorkspace();
    $member = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->withMember($member, WorkspaceRole::Member)
        ->create(['owner_id' => $owner->id]);

    $this->actingAs($owner)
        ->get(route('workspaces.settings', $workspace))
        ->assertOk();

    $this->actingAs($member)
        ->get(route('workspaces.settings', $workspace))
        ->assertOk();
});

test('non-member cannot view workspace settings', function () {
    $owner = createUserWithWorkspace();
    $nonMember = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->create(['owner_id' => $owner->id]);

    $this->actingAs($nonMember)
        ->get(route('workspaces.settings', $workspace))
        ->assertForbidden();
});

test('owner can update workspace name', function () {
    $owner = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->create(['owner_id' => $owner->id]);

    $this->actingAs($owner)
        ->patch(route('workspaces.update', $workspace), ['name' => 'Renamed'])
        ->assertRedirect();

    expect($workspace->fresh()->name)->toBe('Renamed');
});

test('member cannot update workspace', function () {
    $owner = createUserWithWorkspace();
    $member = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->withMember($member, WorkspaceRole::Member)
        ->create(['owner_id' => $owner->id]);

    $this->actingAs($member)
        ->patch(route('workspaces.update', $workspace), ['name' => 'Hacked'])
        ->assertForbidden();
});

test('owner can delete non-personal workspace', function () {
    $owner = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->create(['owner_id' => $owner->id, 'is_personal' => false]);

    $this->actingAs($owner)
        ->delete(route('workspaces.destroy', $workspace))
        ->assertRedirect();

    expect($workspace->fresh())->toBeNull();
});

test('owner cannot delete personal workspace', function () {
    $owner = createUserWithWorkspace();

    $this->actingAs($owner)
        ->delete(route('workspaces.destroy', $owner->personalWorkspace))
        ->assertForbidden();
});

test('admin cannot delete workspace', function () {
    $owner = createUserWithWorkspace();
    $admin = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->withMember($admin, WorkspaceRole::Admin)
        ->create(['owner_id' => $owner->id]);

    $this->actingAs($admin)
        ->delete(route('workspaces.destroy', $workspace))
        ->assertForbidden();
});
