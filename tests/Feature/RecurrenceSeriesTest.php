<?php

use App\Enums\WorkspaceRole;
use App\Models\Board;
use App\Models\User;
use App\Models\Workspace;

beforeEach(function () {
    $this->owner = User::factory()->create();
    $this->workspace = Workspace::factory()
        ->withMember($this->owner, WorkspaceRole::Owner)
        ->create(['owner_id' => $this->owner->id]);
    $this->board = Board::factory()->for($this->workspace)->create();

    $this->validPayload = [
        'board_id' => $this->board->id,
        'title' => 'Daily standup',
        'start_date' => '2026-03-15',
        'time_of_day' => '09:00',
        'duration_minutes' => 30,
        'frequency' => 'daily',
        'interval' => 1,
        'end_count' => 5,
    ];
});

test('non-member cannot create recurrence series on a board', function () {
    $outsider = User::factory()->create();

    $this->actingAs($outsider)
        ->post(route('recurrence-series.store'), $this->validPayload)
        ->assertForbidden();
});

test('workspace member can create recurrence series', function () {
    $this->actingAs($this->owner)
        ->post(route('recurrence-series.store'), $this->validPayload)
        ->assertRedirect();
});

test('board_id must belong to a workspace the user is a member of', function () {
    $otherWorkspace = Workspace::factory()->create();
    $otherBoard = Board::factory()->for($otherWorkspace)->create();

    $payload = array_merge($this->validPayload, ['board_id' => $otherBoard->id]);

    $this->actingAs($this->owner)
        ->post(route('recurrence-series.store'), $payload)
        ->assertForbidden();
});
