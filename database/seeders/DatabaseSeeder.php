<?php

namespace Database\Seeders;

use App\Enums\TagColor;
use App\Models\Tag;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $user = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        $work = Tag::create(['user_id' => $user->id, 'name' => 'Work', 'color' => TagColor::Blue]);
        $personal = Tag::create(['user_id' => $user->id, 'name' => 'Personal', 'color' => TagColor::Green]);
        $health = Tag::create(['user_id' => $user->id, 'name' => 'Health', 'color' => TagColor::Teal]);
        $learning = Tag::create(['user_id' => $user->id, 'name' => 'Learning', 'color' => TagColor::Violet]);
        $errands = Tag::create(['user_id' => $user->id, 'name' => 'Errands', 'color' => TagColor::Orange]);
        $finance = Tag::create(['user_id' => $user->id, 'name' => 'Finance', 'color' => TagColor::Amber]);

        $this->createTask($user, 'Prepare quarterly report', 90, [$work], completed: true, scheduled: true);
        $this->createTask($user, 'Review pull requests', 60, [$work]);
        $this->createTask($user, 'Team standup meeting', 30, [$work], completed: true, scheduled: true);
        $this->createTask($user, 'Update project documentation', 60, [$work, $learning]);

        $this->createTask($user, 'Grocery shopping', 45, [$errands, $personal]);
        $this->createTask($user, 'Call dentist for appointment', 15, [$health, $personal], completed: true);
        $this->createTask($user, 'Clean out garage', 120, [$personal]);

        $this->createTask($user, 'Morning run', 45, [$health], completed: true, scheduled: true);
        $this->createTask($user, 'Meal prep for the week', 90, [$health, $personal]);

        $this->createTask($user, 'Read chapter 5 of design patterns', 60, [$learning]);
        $this->createTask($user, 'Complete online course module', 90, [$learning], scheduled: true);

        $this->createTask($user, 'Pay utility bills', 15, [$finance, $errands], completed: true);
        $this->createTask($user, 'Review monthly budget', 30, [$finance]);
    }

    /**
     * @param  array<int, Tag>  $tags
     */
    private function createTask(
        User $user,
        string $title,
        int $duration,
        array $tags,
        bool $completed = false,
        bool $scheduled = false,
    ): void {
        $factory = Task::factory()->for($user);

        if ($scheduled) {
            $factory = $factory->scheduled();
        }

        $task = $factory->create([
            'title' => $title,
            'duration_minutes' => $duration,
            'is_completed' => $completed,
        ]);

        $task->tags()->attach(array_map(fn (Tag $tag) => $tag->id, $tags));
    }
}
