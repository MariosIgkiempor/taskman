<?php

use App\Enums\WorkspaceRole;
use App\Models\Board;
use App\Models\Workspace;

test('owner can create board in workspace', function () {
    $owner = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->create(['owner_id' => $owner->id]);
    $workspace->boards()->create(['name' => 'Existing', 'position' => 0]);

    $this->actingAs($owner)
        ->post(route('boards.store', $workspace), ['name' => 'New Board', 'color' => 'blue'])
        ->assertRedirect();

    expect($workspace->boards()->where('name', 'New Board')->exists())->toBeTrue();
});

test('admin can create board', function () {
    $owner = createUserWithWorkspace();
    $admin = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->withMember($admin, WorkspaceRole::Admin)
        ->create(['owner_id' => $owner->id]);

    $this->actingAs($admin)
        ->post(route('boards.store', $workspace), ['name' => 'Admin Board'])
        ->assertRedirect();

    expect($workspace->boards()->where('name', 'Admin Board')->exists())->toBeTrue();
});

test('member cannot create board', function () {
    $owner = createUserWithWorkspace();
    $member = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->withMember($member, WorkspaceRole::Member)
        ->create(['owner_id' => $owner->id]);

    $this->actingAs($member)
        ->post(route('boards.store', $workspace), ['name' => 'Blocked Board'])
        ->assertForbidden();
});

test('non-member cannot create board', function () {
    $owner = createUserWithWorkspace();
    $nonMember = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->create(['owner_id' => $owner->id]);

    $this->actingAs($nonMember)
        ->post(route('boards.store', $workspace), ['name' => 'Blocked Board'])
        ->assertForbidden();
});

test('owner can update board', function () {
    $owner = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->create(['owner_id' => $owner->id]);
    $board = Board::factory()->for($workspace)->create();

    $this->actingAs($owner)
        ->patch(route('boards.update', $board), ['name' => 'Updated', 'color' => 'red'])
        ->assertRedirect();

    $fresh = $board->fresh();
    expect($fresh->name)->toBe('Updated');
    expect($fresh->color)->toBe('red');
});

test('member cannot update board', function () {
    $owner = createUserWithWorkspace();
    $member = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->withMember($member, WorkspaceRole::Member)
        ->create(['owner_id' => $owner->id]);
    $board = Board::factory()->for($workspace)->create();

    $this->actingAs($member)
        ->patch(route('boards.update', $board), ['name' => 'Hacked'])
        ->assertForbidden();
});

test('owner can delete board', function () {
    $owner = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->create(['owner_id' => $owner->id]);
    Board::factory()->for($workspace)->count(2)->create();

    $boardToDelete = $workspace->boards()->first();

    $this->actingAs($owner)
        ->delete(route('boards.destroy', $boardToDelete))
        ->assertRedirect();

    expect($boardToDelete->fresh())->toBeNull();
});

test('cannot delete last board in workspace', function () {
    $owner = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->create(['owner_id' => $owner->id]);
    $board = Board::factory()->for($workspace)->create();

    $this->actingAs($owner)
        ->delete(route('boards.destroy', $board))
        ->assertUnprocessable();
});

test('member cannot delete board', function () {
    $owner = createUserWithWorkspace();
    $member = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->withMember($member, WorkspaceRole::Member)
        ->create(['owner_id' => $owner->id]);
    $board = Board::factory()->for($workspace)->create();

    $this->actingAs($member)
        ->delete(route('boards.destroy', $board))
        ->assertForbidden();
});

test('board creation requires name', function () {
    $owner = createUserWithWorkspace();

    $workspace = Workspace::factory()
        ->withMember($owner, WorkspaceRole::Owner)
        ->create(['owner_id' => $owner->id]);

    $this->actingAs($owner)
        ->post(route('boards.store', $workspace), ['name' => ''])
        ->assertSessionHasErrors('name');
});
