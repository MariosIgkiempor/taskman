<?php

namespace Database\Seeders;

use App\Enums\TagColor;
use App\Enums\WorkspaceRole;
use App\Models\Board;
use App\Models\Tag;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
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

        $workspace = Workspace::factory()->personal()->create(['owner_id' => $user->id]);
        $workspace->members()->attach($user, ['role' => WorkspaceRole::Owner->value]);
        $board = Board::factory()->for($workspace)->create(['name' => 'My Tasks']);

        $work = Tag::create(['workspace_id' => $workspace->id, 'name' => 'Work', 'color' => TagColor::Blue]);
        $personal = Tag::create(['workspace_id' => $workspace->id, 'name' => 'Personal', 'color' => TagColor::Green]);
        $health = Tag::create(['workspace_id' => $workspace->id, 'name' => 'Health', 'color' => TagColor::Teal]);
        $learning = Tag::create(['workspace_id' => $workspace->id, 'name' => 'Learning', 'color' => TagColor::Violet]);
        $errands = Tag::create(['workspace_id' => $workspace->id, 'name' => 'Errands', 'color' => TagColor::Orange]);
        $finance = Tag::create(['workspace_id' => $workspace->id, 'name' => 'Finance', 'color' => TagColor::Amber]);

        $tags = compact('work', 'personal', 'health', 'learning', 'errands', 'finance');

        // Weekly scheduled task templates — each entry: [title, duration_minutes, day_of_week (0=Mon), hour, minute, tag_keys, completed_chance]
        $weeklyTemplates = [
            // Monday
            ['Morning run', 45, 0, 6, 30, ['health'], 0.7],
            ['Team standup', 15, 0, 9, 0, ['work'], 0.9],
            ['Sprint planning', 60, 0, 9, 30, ['work'], 0.8],
            ['Lunch break', 30, 0, 12, 0, ['personal'], 0.9],
            ['Code review session', 45, 0, 13, 0, ['work'], 0.6],
            ['1:1 with manager', 30, 0, 14, 30, ['work'], 0.8],
            ['Read industry newsletter', 20, 0, 16, 0, ['learning'], 0.4],
            // Tuesday
            ['Gym — upper body', 60, 1, 7, 0, ['health'], 0.6],
            ['Team standup', 15, 1, 9, 0, ['work'], 0.9],
            ['Feature development', 120, 1, 9, 30, ['work'], 0.5],
            ['Lunch with colleague', 45, 1, 12, 0, ['personal', 'work'], 0.7],
            ['Design review', 45, 1, 13, 30, ['work'], 0.6],
            ['Grocery pickup', 30, 1, 17, 30, ['errands'], 0.5],
            // Wednesday
            ['Morning yoga', 30, 2, 6, 45, ['health'], 0.5],
            ['Team standup', 15, 2, 9, 0, ['work'], 0.9],
            ['Deep work block', 90, 2, 9, 30, ['work'], 0.4],
            ['Architecture discussion', 45, 2, 11, 15, ['work', 'learning'], 0.6],
            ['Lunch break', 30, 2, 12, 30, ['personal'], 0.9],
            ['Bug triage', 60, 2, 13, 30, ['work'], 0.5],
            ['Online course module', 45, 2, 15, 30, ['learning'], 0.3],
            ['Dentist appointment', 60, 2, 16, 30, ['health', 'personal'], 0.2],
            // Thursday
            ['Morning run', 45, 3, 6, 30, ['health'], 0.6],
            ['Team standup', 15, 3, 9, 0, ['work'], 0.9],
            ['Feature development', 90, 3, 9, 15, ['work'], 0.5],
            ['Cross-team sync', 30, 3, 11, 0, ['work'], 0.7],
            ['Lunch break', 30, 3, 12, 0, ['personal'], 0.9],
            ['PR reviews', 60, 3, 13, 0, ['work'], 0.5],
            ['Review monthly budget', 30, 3, 15, 0, ['finance'], 0.3],
            ['Pick up dry cleaning', 20, 3, 17, 45, ['errands'], 0.4],
            // Friday
            ['Gym — lower body', 60, 4, 7, 0, ['health'], 0.5],
            ['Team standup', 15, 4, 9, 0, ['work'], 0.9],
            ['Sprint retrospective', 45, 4, 9, 30, ['work'], 0.8],
            ['Documentation update', 60, 4, 10, 30, ['work', 'learning'], 0.4],
            ['Lunch break', 30, 4, 12, 0, ['personal'], 0.9],
            ['Deploy release', 45, 4, 13, 30, ['work'], 0.3],
            ['Weekly review & planning', 30, 4, 15, 0, ['work', 'personal'], 0.4],
            ['Pay bills', 15, 4, 16, 0, ['finance', 'errands'], 0.3],
            // Saturday
            ['Long run', 75, 5, 8, 0, ['health'], 0.4],
            ['Farmers market', 60, 5, 10, 30, ['errands', 'personal'], 0.3],
            ['Meal prep', 90, 5, 13, 0, ['health', 'personal'], 0.3],
            ['Read design patterns book', 60, 5, 15, 30, ['learning'], 0.2],
            // Sunday
            ['Morning yoga', 30, 6, 8, 30, ['health'], 0.4],
            ['Clean apartment', 90, 6, 10, 0, ['personal'], 0.2],
            ['Call parents', 30, 6, 14, 0, ['personal'], 0.3],
            ['Week prep — clothes & bag', 20, 6, 18, 0, ['personal'], 0.2],
        ];

        // Generate 10 weeks: 5 before and 5 after (including current week)
        $currentWeekStart = now()->startOfWeek();

        for ($weekOffset = -5; $weekOffset <= 4; $weekOffset++) {
            $weekStart = $currentWeekStart->copy()->addWeeks($weekOffset);
            $isPast = $weekOffset < 0;
            $isCurrentWeek = $weekOffset === 0;

            // Pick ~30 tasks per week by randomly skipping a few templates
            foreach ($weeklyTemplates as $template) {
                [$title, $duration, $dayOfWeek, $hour, $minute, $tagKeys, $completedChance] = $template;

                // Skip ~25% of tasks randomly for variety
                if (fake()->boolean(25)) {
                    continue;
                }

                $scheduledAt = $weekStart->copy()->addDays($dayOfWeek)->setTime($hour, $minute);

                // Round to nearest 5 minutes (already done in templates, but ensure)
                $roundedMinute = (int) (round($scheduledAt->minute / 5) * 5);
                $scheduledAt->setTime($scheduledAt->hour, $roundedMinute);

                $isCompleted = $isPast
                    ? fake()->boolean((int) ($completedChance * 100))
                    : ($isCurrentWeek && $scheduledAt->isPast() ? fake()->boolean((int) ($completedChance * 80)) : false);

                $taskTags = array_map(fn (string $key) => $tags[$key], $tagKeys);

                $task = Task::factory()->for($board)->for($user)->create([
                    'title' => $title,
                    'duration_minutes' => $duration,
                    'scheduled_at' => $scheduledAt,
                    'is_completed' => $isCompleted,
                ]);

                $task->tags()->attach(array_map(fn (Tag $tag) => $tag->id, $taskTags));
            }
        }

        // Unscheduled backlog tasks (no duration set since they're not on the calendar)
        $backlogTasks = [
            ['Refactor authentication module', ['work', 'learning']],
            ['Set up home office monitor arm', ['personal']],
            ['Research new CI/CD pipeline options', ['work', 'learning']],
            ['Book flights for vacation', ['personal']],
            ['Update resume', ['personal', 'work']],
            ['Fix flaky integration tests', ['work']],
            ['Organize photo library', ['personal']],
            ['Compare health insurance plans', ['finance', 'health']],
            ['Write blog post draft', ['learning', 'personal']],
            ['Return Amazon package', ['errands']],
            ['Replace kitchen faucet', ['personal', 'errands']],
            ['Review investment portfolio', ['finance']],
            ['Learn Rust basics', ['learning']],
            ['Schedule car oil change', ['errands']],
            ['Clean out email inbox', ['work', 'personal']],
        ];

        $position = 0;
        foreach ($backlogTasks as [$title, $tagKeys]) {
            $isCompleted = fake()->boolean(20);
            $taskTags = array_map(fn (string $key) => $tags[$key], $tagKeys);

            $task = Task::factory()->for($board)->for($user)->create([
                'title' => $title,
                'duration_minutes' => 0,
                'scheduled_at' => null,
                'is_completed' => $isCompleted,
                'position' => $position++,
            ]);

            $task->tags()->attach(array_map(fn (Tag $tag) => $tag->id, $taskTags));
        }
    }
}
