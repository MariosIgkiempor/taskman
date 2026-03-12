<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\RecurrenceSeries>
 */
class RecurrenceSeriesFactory extends Factory
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
            'time_of_day' => '09:00',
            'duration_minutes' => 60,
            'location' => null,
            'location_coordinates' => null,
            'frequency' => 'weekly',
            'interval' => 1,
            'days_of_week' => null,
            'month_day' => null,
            'month_week_ordinal' => null,
            'month_week_day' => null,
            'end_date' => null,
            'end_count' => null,
            'start_date' => now()->toDateString(),
            'generated_until' => now()->toDateString(),
            'next_index' => 0,
        ];
    }

    public function daily(): static
    {
        return $this->state(fn (array $attributes) => [
            'frequency' => 'daily',
        ]);
    }

    public function weekly(?array $days = null): static
    {
        return $this->state(fn (array $attributes) => [
            'frequency' => 'weekly',
            'days_of_week' => $days,
        ]);
    }

    public function monthly(?int $day = null): static
    {
        return $this->state(fn (array $attributes) => [
            'frequency' => 'monthly',
            'month_day' => $day ?? 1,
        ]);
    }

    public function yearly(): static
    {
        return $this->state(fn (array $attributes) => [
            'frequency' => 'yearly',
        ]);
    }

    public function withEndDate(string $date): static
    {
        return $this->state(fn (array $attributes) => [
            'end_date' => $date,
        ]);
    }

    public function withEndCount(int $count): static
    {
        return $this->state(fn (array $attributes) => [
            'end_count' => $count,
        ]);
    }
}
