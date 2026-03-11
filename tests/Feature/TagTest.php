<?php

use App\Enums\TagColor;
use App\Models\Tag;
use App\Models\Task;

test('guests cannot access tags', function () {
    $this->get(route('tags.index'))->assertRedirect(route('login'));
    $this->post(route('tags.store'))->assertRedirect(route('login'));
});

test('can list tags', function () {
    $user = createUserWithWorkspace();
    Tag::factory()->for($user->personalWorkspace)->count(3)->create();

    $response = $this->actingAs($user)
        ->getJson(route('tags.index'))
        ->assertOk();

    expect($response->json())->toHaveCount(3);
});

test('can create a tag', function () {
    $user = createUserWithWorkspace();

    $this->actingAs($user)
        ->postJson(route('tags.store'), ['name' => 'work', 'color' => 'blue'])
        ->assertCreated();

    $workspace = $user->personalWorkspace;
    expect($workspace->tags()->count())->toBe(1);
    expect($workspace->tags()->first()->name)->toBe('work');
    expect($workspace->tags()->first()->color)->toBe(TagColor::Blue);
});

test('creating a tag requires name and color', function () {
    $user = createUserWithWorkspace();

    $this->actingAs($user)
        ->postJson(route('tags.store'), [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name', 'color']);
});

test('tag name must be unique per workspace', function () {
    $user = createUserWithWorkspace();
    Tag::factory()->for($user->personalWorkspace)->create(['name' => 'work']);

    $this->actingAs($user)
        ->postJson(route('tags.store'), ['name' => 'work', 'color' => 'red'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('name');
});

test('different workspaces can have same tag name', function () {
    $user1 = createUserWithWorkspace();
    $user2 = createUserWithWorkspace();
    Tag::factory()->for($user1->personalWorkspace)->create(['name' => 'work']);

    $this->actingAs($user2)
        ->postJson(route('tags.store'), ['name' => 'work', 'color' => 'red'])
        ->assertCreated();
});

test('can delete a tag', function () {
    $user = createUserWithWorkspace();
    $tag = Tag::factory()->for($user->personalWorkspace)->create();

    $this->actingAs($user)
        ->deleteJson(route('tags.destroy', $tag))
        ->assertNoContent();

    expect($tag->fresh())->toBeNull();
});

test('cannot delete another user tag', function () {
    $user = createUserWithWorkspace();
    $otherUser = createUserWithWorkspace();
    $tag = Tag::factory()->for($otherUser->personalWorkspace)->create();

    $this->actingAs($user)
        ->deleteJson(route('tags.destroy', $tag))
        ->assertForbidden();
});

test('can update a tag color', function () {
    $user = createUserWithWorkspace();
    $tag = Tag::factory()->for($user->personalWorkspace)->create(['color' => TagColor::Blue]);

    $this->actingAs($user)
        ->patchJson(route('tags.update', $tag), ['color' => 'red'])
        ->assertOk();

    expect($tag->fresh()->color)->toBe(TagColor::Red);
});

test('cannot update another user tag color', function () {
    $user = createUserWithWorkspace();
    $otherUser = createUserWithWorkspace();
    $tag = Tag::factory()->for($otherUser->personalWorkspace)->create();

    $this->actingAs($user)
        ->patchJson(route('tags.update', $tag), ['color' => 'red'])
        ->assertForbidden();
});

test('color must be a valid enum value', function () {
    $user = createUserWithWorkspace();
    $tag = Tag::factory()->for($user->personalWorkspace)->create();

    $this->actingAs($user)
        ->patchJson(route('tags.update', $tag), ['color' => 'invalid-color'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('color');
});

test('can sync tags on a task', function () {
    $user = createUserWithWorkspace();
    $board = $user->personalWorkspace->boards()->first();
    $task = Task::factory()->for($user)->for($board)->create();
    $tags = Tag::factory()->for($user->personalWorkspace)->count(2)->create();

    $this->actingAs($user)
        ->patchJson(route('tasks.tags.sync', $task), ['tag_ids' => $tags->pluck('id')->toArray()])
        ->assertOk();

    expect($task->fresh()->tags)->toHaveCount(2);
});

test('cannot sync tags on another user task', function () {
    $user = createUserWithWorkspace();
    $otherUser = createUserWithWorkspace();
    $otherBoard = $otherUser->personalWorkspace->boards()->first();
    $task = Task::factory()->for($otherUser)->for($otherBoard)->create();
    $tag = Tag::factory()->for($user->personalWorkspace)->create();

    $this->actingAs($user)
        ->patchJson(route('tasks.tags.sync', $task), ['tag_ids' => [$tag->id]])
        ->assertForbidden();
});

test('can create task with tags', function () {
    $user = createUserWithWorkspace();
    $tags = Tag::factory()->for($user->personalWorkspace)->count(2)->create();

    $this->actingAs($user)
        ->post(route('tasks.store'), [
            'title' => 'Tagged task',
            'tag_ids' => $tags->pluck('id')->toArray(),
        ])
        ->assertRedirect();

    $task = $user->tasks()->first();
    expect($task->tags)->toHaveCount(2);
});

test('tasks index includes tags via eager loading', function () {
    $user = createUserWithWorkspace();
    $tag = Tag::factory()->for($user->personalWorkspace)->create();
    $task = Task::factory()->for($user)->create();
    $task->tags()->attach($tag);

    $response = $this->actingAs($user)
        ->get(route('tasks.index'))
        ->assertOk();

    $props = $response->original->getData()['page']['props'];

    expect($props['unscheduledTasks'][0]['tags'])->toHaveCount(1);
    expect($props['tags'])->toHaveCount(1);
});
