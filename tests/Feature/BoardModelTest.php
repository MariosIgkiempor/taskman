<?php

use App\Models\Board;
use App\Models\Task;
use App\Models\Workspace;

test('board factory creates valid model', function () {
    $board = Board::factory()->create();

    expect($board)->toBeInstanceOf(Board::class);
    expect($board->name)->toBeString();
    expect($board->workspace)->toBeInstanceOf(Workspace::class);
});

test('board belongs to workspace', function () {
    $workspace = Workspace::factory()->create();
    $board = Board::factory()->for($workspace)->create();

    expect($board->workspace->id)->toBe($workspace->id);
});

test('board has tasks', function () {
    $board = Board::factory()->create();
    Task::factory()->for($board)->count(3)->create();

    expect($board->tasks)->toHaveCount(3);
});

test('task belongs to board', function () {
    $board = Board::factory()->create();
    $task = Task::factory()->for($board)->create();

    expect($task->board->id)->toBe($board->id);
});
