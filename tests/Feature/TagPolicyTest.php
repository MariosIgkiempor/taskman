<?php

use App\Enums\WorkspaceRole;
use App\Models\Tag;
use App\Models\User;
use App\Models\Workspace;

test('any member can view tag', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Member)
        ->create();
    $tag = Tag::factory()->for($workspace)->create();

    expect($user->can('view', $tag))->toBeTrue();
});

test('any member can update tag', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Member)
        ->create();
    $tag = Tag::factory()->for($workspace)->create();

    expect($user->can('update', $tag))->toBeTrue();
});

test('owner can delete tag', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Owner)
        ->create(['owner_id' => $user->id]);
    $tag = Tag::factory()->for($workspace)->create();

    expect($user->can('delete', $tag))->toBeTrue();
});

test('admin can delete tag', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Admin)
        ->create();
    $tag = Tag::factory()->for($workspace)->create();

    expect($user->can('delete', $tag))->toBeTrue();
});

test('member cannot delete tag', function () {
    $user = User::factory()->create();
    $workspace = Workspace::factory()
        ->withMember($user, WorkspaceRole::Member)
        ->create();
    $tag = Tag::factory()->for($workspace)->create();

    expect($user->can('delete', $tag))->toBeFalse();
});

test('non-member cannot view tag', function () {
    $user = User::factory()->create();
    $tag = Tag::factory()->create();

    expect($user->can('view', $tag))->toBeFalse();
});

test('non-member cannot delete tag', function () {
    $user = User::factory()->create();
    $tag = Tag::factory()->create();

    expect($user->can('delete', $tag))->toBeFalse();
});
