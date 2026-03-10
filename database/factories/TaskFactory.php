<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Task>
 */
class TaskFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => fake()->sentence(3),
            'description' => null,
            'scheduled_at' => null,
            'is_completed' => false,
            'duration_minutes' => 60,
            'position' => 0,
            'location' => null,
            'location_coordinates' => null,
        ];
    }

    public function withLocation(): static
    {
        return $this->state(fn (array $attributes) => [
            'location' => fake()->address(),
            'location_coordinates' => ['lat' => fake()->latitude(), 'lng' => fake()->longitude()],
        ]);
    }

    public function scheduled(): static
    {
        return $this->state(fn (array $attributes) => [
            'scheduled_at' => fake()->dateTimeBetween('now', '+7 days'),
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_completed' => true,
        ]);
    }

    public function withDescription(): static
    {
        return $this->state(fn (array $attributes) => [
            'description' => fake()->paragraph(),
        ]);
    }
}
