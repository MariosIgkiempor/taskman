<?php

use App\Models\User;

it('provisions a personal workspace and board on registration', function () {
    $response = $this->post('/register', [
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertRedirect();

    $user = User::where('email', 'jane@example.com')->first();

    expect($user)->not->toBeNull();
    $this->assertAuthenticatedAs($user);

    $workspace = $user->personalWorkspace;

    expect($workspace)->not->toBeNull()
        ->and($workspace->is_personal)->toBeTrue()
        ->and($workspace->owner_id)->toBe($user->id);

    expect($workspace->members()->where('user_id', $user->id)->exists())->toBeTrue();

    $board = $workspace->boards()->first();

    expect($board)->not->toBeNull()
        ->and($board->name)->toBe('My Tasks');
});

it('allows a newly registered user to access the tasks page', function () {
    $this->post('/register', [
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $user = User::where('email', 'jane@example.com')->first();

    $this->get(route('tasks.index', $user->personalWorkspace))->assertOk();
});
