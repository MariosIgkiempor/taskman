<?php

namespace Database\Factories;

use App\Enums\WorkspaceRole;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Workspace>
 */
class WorkspaceFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'is_personal' => false,
            'owner_id' => User::factory(),
        ];
    }

    public function personal(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_personal' => true,
        ]);
    }

    public function withMember(User $user, WorkspaceRole $role = WorkspaceRole::Member): static
    {
        return $this->afterCreating(fn (Workspace $workspace) => $workspace->members()->attach($user, ['role' => $role->value]));
    }
}
