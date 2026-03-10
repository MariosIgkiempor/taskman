<?php

use App\Models\User;
use Illuminate\Support\Facades\Http;

test('geocode endpoint requires authentication', function () {
    $this->get(route('geocode', ['query' => 'test']))
        ->assertRedirect(route('login'));
});

test('geocode endpoint requires a query', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('geocode'))
        ->assertSessionHasErrors('query');
});

test('geocode endpoint requires query to be at least 2 characters', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('geocode', ['query' => 'a']))
        ->assertSessionHasErrors('query');
});

test('geocode endpoint returns mapped results from mapbox', function () {
    $user = User::factory()->create();

    Http::fake([
        'api.mapbox.com/*' => Http::response([
            'features' => [
                [
                    'place_name' => '123 Main St, New York, NY 10001',
                    'center' => [-74.0060, 40.7128],
                ],
                [
                    'place_name' => '456 Broadway, New York, NY 10012',
                    'center' => [-73.9965, 40.7260],
                ],
            ],
        ]),
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('geocode', ['query' => 'New York']))
        ->assertOk();

    $response->assertJsonCount(2);
    $response->assertJsonFragment([
        'label' => '123 Main St, New York, NY 10001',
        'coordinates' => ['lat' => 40.7128, 'lng' => -74.0060],
    ]);
});
