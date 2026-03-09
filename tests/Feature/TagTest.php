<?php

use App\Enums\TagColor;
use App\Models\Tag;
use App\Models\Task;
use App\Models\User;

test('guests cannot access tags', function () {
    $this->get(route('tags.index'))->assertRedirect(route('login'));
    $this->post(route('tags.store'))->assertRedirect(route('login'));
});

test('can list tags', function () {
    $user = User::factory()->create();
    Tag::factory()->for($user)->count(3)->create();

    $response = $this->actingAs($user)
        ->getJson(route('tags.index'))
        ->assertOk();

    expect($response->json())->toHaveCount(3);
});

test('can create a tag', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson(route('tags.store'), ['name' => 'work', 'color' => 'blue'])
        ->assertCreated();

    expect($user->tags()->count())->toBe(1);
    expect($user->tags()->first()->name)->toBe('work');
    expect($user->tags()->first()->color)->toBe(TagColor::Blue);
});

test('creating a tag requires name and color', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson(route('tags.store'), [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name', 'color']);
});

test('tag name must be unique per user', function () {
    $user = User::factory()->create();
    Tag::factory()->for($user)->create(['name' => 'work']);

    $this->actingAs($user)
        ->postJson(route('tags.store'), ['name' => 'work', 'color' => 'red'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('name');
});

test('different users can have same tag name', function () {
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();
    Tag::factory()->for($user1)->create(['name' => 'work']);

    $this->actingAs($user2)
        ->postJson(route('tags.store'), ['name' => 'work', 'color' => 'red'])
        ->assertCreated();
});

test('can delete a tag', function () {
    $user = User::factory()->create();
    $tag = Tag::factory()->for($user)->create();

    $this->actingAs($user)
        ->deleteJson(route('tags.destroy', $tag))
        ->assertNoContent();

    expect($tag->fresh())->toBeNull();
});

test('cannot delete another user tag', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $tag = Tag::factory()->for($otherUser)->create();

    $this->actingAs($user)
        ->deleteJson(route('tags.destroy', $tag))
        ->assertForbidden();
});

test('can sync tags on a task', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->create();
    $tags = Tag::factory()->for($user)->count(2)->create();

    $this->actingAs($user)
        ->patchJson(route('tasks.tags.sync', $task), ['tag_ids' => $tags->pluck('id')->toArray()])
        ->assertOk();

    expect($task->fresh()->tags)->toHaveCount(2);
});

test('cannot sync tags on another user task', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $task = Task::factory()->for($otherUser)->create();
    $tag = Tag::factory()->for($user)->create();

    $this->actingAs($user)
        ->patchJson(route('tasks.tags.sync', $task), ['tag_ids' => [$tag->id]])
        ->assertForbidden();
});

test('can create task with tags', function () {
    $user = User::factory()->create();
    $tags = Tag::factory()->for($user)->count(2)->create();

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
    $user = User::factory()->create();
    $tag = Tag::factory()->for($user)->create();
    $task = Task::factory()->for($user)->create();
    $task->tags()->attach($tag);

    $response = $this->actingAs($user)
        ->get(route('tasks.index'))
        ->assertOk();

    $props = $response->original->getData()['page']['props'];

    expect($props['unscheduledTasks'][0]['tags'])->toHaveCount(1);
    expect($props['tags'])->toHaveCount(1);
});
