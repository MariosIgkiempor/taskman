<?php

use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceInvite;

test('workspace invite factory creates valid model', function () {
    $invite = WorkspaceInvite::factory()->create();

    expect($invite)->toBeInstanceOf(WorkspaceInvite::class);
    expect($invite->workspace)->toBeInstanceOf(Workspace::class);
    expect($invite->creator)->toBeInstanceOf(User::class);
});

test('workspace invite auto-generates token on creation', function () {
    $invite = WorkspaceInvite::factory()->create();

    expect($invite->token)->toBeString();
    expect(strlen($invite->token))->toBe(64);
});

test('workspace invite token is unique per invite', function () {
    $invite1 = WorkspaceInvite::factory()->create();
    $invite2 = WorkspaceInvite::factory()->create();

    expect($invite1->token)->not->toBe($invite2->token);
});

test('workspace invite belongs to workspace', function () {
    $workspace = Workspace::factory()->create();
    $invite = WorkspaceInvite::factory()->for($workspace)->create();

    expect($invite->workspace->id)->toBe($workspace->id);
});

test('workspace invite belongs to creator', function () {
    $user = User::factory()->create();
    $invite = WorkspaceInvite::factory()->create(['created_by' => $user->id]);

    expect($invite->creator->id)->toBe($user->id);
});

test('workspace invite casts expires_at to datetime', function () {
    $invite = WorkspaceInvite::factory()->create(['expires_at' => '2026-12-31 23:59:59']);

    expect($invite->expires_at)->toBeInstanceOf(\Carbon\CarbonImmutable::class);
});
