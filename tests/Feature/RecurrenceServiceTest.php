<?php

use App\Models\Board;
use App\Models\RecurrenceSeries;
use App\Models\Tag;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use App\Services\RecurrenceService;
use Illuminate\Support\Carbon;

beforeEach(function () {
    $this->service = new RecurrenceService;
    $this->user = User::factory()->create();
    $workspace = Workspace::factory()->create(['owner_id' => $this->user->id]);
    $workspace->members()->attach($this->user, ['role' => 'owner']);
    $this->board = Board::factory()->create(['workspace_id' => $workspace->id]);
    Carbon::setTestNow('2026-03-11 10:00:00');
});

// --- Series creation ---

test('creates a daily recurring series with instances', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Daily standup',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 30,
        'frequency' => 'daily',
        'interval' => 1,
        'start_date' => '2026-03-11',
    ]);

    expect($series->exists)->toBeTrue();
    expect($series->tasks()->count())->toBeGreaterThan(0);

    // 12 weeks of daily tasks (inclusive of boundaries)
    expect($series->tasks()->count())->toBeGreaterThanOrEqual(84);
    expect($series->tasks()->first()->title)->toBe('Daily standup');
    expect($series->tasks()->first()->duration_minutes)->toBe(30);
});

test('creates a weekly recurring series on specific days', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'MWF workout',
        'description' => null,
        'time_of_day' => '07:00',
        'duration_minutes' => 60,
        'frequency' => 'weekly',
        'interval' => 1,
        'days_of_week' => [1, 3, 5], // Mon, Wed, Fri
        'start_date' => '2026-03-11',
    ]);

    $taskCount = $series->tasks()->count();
    // 3 days per week * ~12 weeks
    expect($taskCount)->toBeGreaterThanOrEqual(36);

    // Verify all tasks fall on Mon/Wed/Fri
    $days = $series->tasks->map(fn (Task $t) => $t->scheduled_at->dayOfWeekIso)->unique()->sort()->values();
    expect($days->all())->toBe([1, 3, 5]);
});

test('creates a monthly recurring series on a specific day', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Monthly review',
        'description' => null,
        'time_of_day' => '14:00',
        'duration_minutes' => 120,
        'frequency' => 'monthly',
        'interval' => 1,
        'month_day' => 15,
        'start_date' => '2026-03-11',
    ]);

    // March 15 through ~June 3 (12 weeks) = Mar, Apr, May = 3 instances
    expect($series->tasks()->count())->toBe(3);
    expect($series->tasks->every(fn (Task $t) => $t->scheduled_at->day === 15))->toBeTrue();
});

test('creates a monthly ordinal recurring series', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'First Monday meeting',
        'description' => null,
        'time_of_day' => '10:00',
        'duration_minutes' => 60,
        'frequency' => 'monthly',
        'interval' => 1,
        'month_week_ordinal' => 1,
        'month_week_day' => 1, // Monday
        'start_date' => '2026-03-02', // First Monday of March 2026
    ]);

    expect($series->tasks()->count())->toBeGreaterThan(0);
    $series->tasks->each(function (Task $t) {
        // Verify each instance is the first Monday of its month
        $weekInMonth = (int) ceil($t->scheduled_at->day / 7);
        expect($weekInMonth)->toBe(1);
        expect($t->scheduled_at->dayOfWeekIso)->toBe(1);
    });
});

test('creates a yearly recurring series', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Anniversary',
        'description' => null,
        'time_of_day' => '12:00',
        'duration_minutes' => 60,
        'frequency' => 'yearly',
        'interval' => 1,
        'start_date' => '2026-03-11',
    ]);

    // Only 1 instance within 12 weeks (same year)
    expect($series->tasks()->count())->toBe(1);
});

test('respects end_count when creating series', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Limited series',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 60,
        'frequency' => 'daily',
        'interval' => 1,
        'end_count' => 5,
        'start_date' => '2026-03-11',
    ]);

    expect($series->tasks()->count())->toBe(5);
});

test('respects end_date when creating series', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Ends in 2 weeks',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 60,
        'frequency' => 'daily',
        'interval' => 1,
        'end_date' => '2026-03-25',
        'start_date' => '2026-03-11',
    ]);

    // 15 days: Mar 11 through Mar 25
    expect($series->tasks()->count())->toBe(15);
    expect($series->tasks->last()->scheduled_at->toDateString())->toBe('2026-03-25');
});

test('copies tags to generated instances', function () {
    $tag = Tag::factory()->create(['workspace_id' => $this->board->workspace_id]);

    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Tagged task',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 60,
        'frequency' => 'weekly',
        'interval' => 1,
        'start_date' => '2026-03-11',
    ], [$tag->id]);

    expect($series->tags)->toHaveCount(1);
    $series->tasks->each(function (Task $t) use ($tag) {
        expect($t->tags->pluck('id')->all())->toContain($tag->id);
    });
});

test('copies reminders to generated instances', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'With reminders',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 60,
        'frequency' => 'weekly',
        'interval' => 1,
        'start_date' => '2026-03-11',
    ], [], [15, 30]);

    expect($series->reminders)->toHaveCount(2);
    $series->tasks->each(function (Task $t) {
        expect($t->reminders)->toHaveCount(2);
    });
});

// --- Edit operations ---

test('edit single instance marks as exception', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Original',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 60,
        'frequency' => 'daily',
        'interval' => 1,
        'end_count' => 5,
        'start_date' => '2026-03-11',
    ]);

    $task = $series->tasks()->orderBy('recurrence_index')->first();
    $this->service->editSingleInstance($task, ['title' => 'Changed']);

    $task->refresh();
    expect($task->title)->toBe('Changed');
    expect($task->is_recurrence_exception)->toBeTrue();

    // Other tasks unchanged
    expect($series->tasks()->where('id', '!=', $task->id)->where('title', 'Original')->count())->toBe(4);
});

test('edit this and following splits series', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Original',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 60,
        'frequency' => 'daily',
        'interval' => 1,
        'end_count' => 10,
        'start_date' => '2026-03-11',
    ]);

    // Split at index 3 (scheduled_at = 2026-03-14)
    $task = $series->tasks()->where('recurrence_index', 3)->first();
    $newSeries = $this->service->editThisAndFollowing($task, ['title' => 'Changed']);

    $series->refresh();

    // Original series should have tasks 0-2
    expect($series->tasks()->count())->toBe(3);

    // New series should have instances generated (no end_count inherited since it's a fresh series)
    expect($newSeries->title)->toBe('Changed');
    expect($newSeries->tasks()->count())->toBeGreaterThan(0);
    $newSeries->tasks->each(fn (Task $t) => expect($t->title)->toBe('Changed'));
});

test('edit all instances updates template and future tasks', function () {
    Carbon::setTestNow('2026-03-11 06:00:00');

    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Original',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 60,
        'frequency' => 'daily',
        'interval' => 1,
        'end_count' => 5,
        'start_date' => '2026-03-11',
    ]);

    $this->service->editAllInstances($series, ['title' => 'Updated']);

    $series->refresh();
    expect($series->title)->toBe('Updated');
    // Re-fetch tasks from DB since the collection was updated via bulk query
    $series->tasks()->get()->each(fn (Task $t) => expect($t->title)->toBe('Updated'));
});

// --- Delete operations ---

test('delete single instance removes only that task', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Test',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 60,
        'frequency' => 'daily',
        'interval' => 1,
        'end_count' => 5,
        'start_date' => '2026-03-11',
    ]);

    $task = $series->tasks()->where('recurrence_index', 2)->first();
    $this->service->deleteSingleInstance($task);

    expect($series->tasks()->count())->toBe(4);
});

test('delete this and following removes future instances', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Test',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 60,
        'frequency' => 'daily',
        'interval' => 1,
        'end_count' => 10,
        'start_date' => '2026-03-11',
    ]);

    $task = $series->tasks()->where('recurrence_index', 3)->first();
    $this->service->deleteThisAndFollowing($task);

    $series->refresh();
    expect($series->tasks()->count())->toBe(3);
    expect($series->end_date->toDateString())->toBe('2026-03-13');
});

test('delete all instances removes series and all tasks', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Test',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 60,
        'frequency' => 'daily',
        'interval' => 1,
        'end_count' => 5,
        'start_date' => '2026-03-11',
    ]);

    $seriesId = $series->id;
    $this->service->deleteAllInstances($series);

    expect(RecurrenceSeries::find($seriesId))->toBeNull();
    expect(Task::where('recurrence_series_id', $seriesId)->count())->toBe(0);
});

// --- Extend series ---

test('extendSeriesForUser generates instances on demand when navigating past horizon', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Never-ending daily',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 30,
        'frequency' => 'daily',
        'interval' => 1,
        'start_date' => '2026-03-11',
    ]);

    $initialCount = $series->tasks()->count();
    $initialGeneratedUntil = $series->generated_until;

    // Navigate to a week 20 weeks in the future (beyond the 12-week horizon)
    $farFutureWeekEnd = Carbon::parse('2026-03-11')->addWeeks(20)->endOfWeek();
    $generated = $this->service->extendSeriesForUser($this->user, $farFutureWeekEnd);

    $series->refresh();

    expect($generated)->toBeGreaterThan(0);
    expect($series->tasks()->count())->toBeGreaterThan($initialCount);
    // generated_until should now be at least the target + 4 weeks buffer
    expect(Carbon::parse($series->generated_until)->gte($farFutureWeekEnd))->toBeTrue();

    // Verify tasks exist on the far-future date
    $farFutureTask = $series->tasks()
        ->whereDate('scheduled_at', $farFutureWeekEnd->copy()->startOfWeek()->toDateString())
        ->first();
    expect($farFutureTask)->not->toBeNull();
});

test('extendSeriesForUser does not generate for series with end_date in the past', function () {
    $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Already ended',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 30,
        'frequency' => 'daily',
        'interval' => 1,
        'start_date' => '2026-03-11',
        'end_date' => '2026-03-15',
    ]);

    $farFuture = Carbon::parse('2026-07-01');
    $generated = $this->service->extendSeriesForUser($this->user, $farFuture);

    expect($generated)->toBe(0);
});

test('extend all series generates new instances', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Test',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 60,
        'frequency' => 'weekly',
        'interval' => 1,
        'start_date' => '2026-03-11',
    ]);

    $initialCount = $series->tasks()->count();

    // Move time forward 4 weeks
    Carbon::setTestNow('2026-04-08 10:00:00');
    $generated = $this->service->extendAllSeries(12);

    expect($generated)->toBeGreaterThan(0);
    expect($series->tasks()->count())->toBeGreaterThan($initialCount);
});

// --- Interval variations ---

test('every 2 weeks generates correct dates', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Biweekly',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 60,
        'frequency' => 'weekly',
        'interval' => 2,
        'start_date' => '2026-03-11',
    ]);

    // 12 weeks / 2-week interval ≈ 7 instances (start date inclusive, horizon inclusive)
    expect($series->tasks()->count())->toBe(7);

    // All should be on Wednesday (Mar 11 is Wed)
    $dates = $series->tasks->pluck('scheduled_at')->map(fn ($d) => $d->toDateString())->all();
    // Verify 2-week spacing
    for ($i = 1; $i < count($dates); $i++) {
        $diff = Carbon::parse($dates[$i - 1])->diffInDays(Carbon::parse($dates[$i]));
        expect((int) $diff)->toBe(14);
    }
});

test('every 3 days generates correct dates', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Every 3 days',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 60,
        'frequency' => 'daily',
        'interval' => 3,
        'end_count' => 5,
        'start_date' => '2026-03-11',
    ]);

    expect($series->tasks()->count())->toBe(5);

    $dates = $series->tasks->pluck('scheduled_at')->map(fn ($d) => $d->toDateString())->all();
    expect($dates[0])->toBe('2026-03-11');
    expect($dates[1])->toBe('2026-03-14');
    expect($dates[2])->toBe('2026-03-17');
});

// --- Controller integration ---

test('can create a recurrence series via controller', function () {
    $this->actingAs($this->user)
        ->post(route('recurrence-series.store'), [
            'board_id' => $this->board->id,
            'title' => 'Controller test',
            'start_date' => '2026-03-11',
            'time_of_day' => '09:00',
            'duration_minutes' => 60,
            'frequency' => 'daily',
            'interval' => 1,
            'end_count' => 3,
        ])
        ->assertRedirect();

    expect($this->user->recurrenceSeries()->count())->toBe(1);
    expect($this->user->tasks()->count())->toBe(3);
});

test('can delete a recurring task with scope single', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Test',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 60,
        'frequency' => 'daily',
        'interval' => 1,
        'end_count' => 5,
        'start_date' => '2026-03-11',
    ]);

    $task = $series->tasks()->first();

    $this->actingAs($this->user)
        ->delete(route('tasks.destroy', $task), ['recurrence_scope' => 'single'])
        ->assertRedirect();

    expect($series->tasks()->count())->toBe(4);
});

test('can delete a recurring task with scope all', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Test',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 60,
        'frequency' => 'daily',
        'interval' => 1,
        'end_count' => 5,
        'start_date' => '2026-03-11',
    ]);

    $task = $series->tasks()->first();
    $seriesId = $series->id;

    $this->actingAs($this->user)
        ->delete(route('tasks.destroy', $task), ['recurrence_scope' => 'all'])
        ->assertRedirect();

    expect(RecurrenceSeries::find($seriesId))->toBeNull();
    expect(Task::where('recurrence_series_id', $seriesId)->count())->toBe(0);
});

test('can update a recurring task with scope single', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Original',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 60,
        'frequency' => 'daily',
        'interval' => 1,
        'end_count' => 5,
        'start_date' => '2026-03-11',
    ]);

    $task = $series->tasks()->first();

    $this->actingAs($this->user)
        ->patch(route('tasks.update', $task), [
            'title' => 'Changed',
            'recurrence_scope' => 'single',
        ])
        ->assertRedirect();

    $task->refresh();
    expect($task->title)->toBe('Changed');
    expect($task->is_recurrence_exception)->toBeTrue();
});

test('duplicate creates standalone non-recurring task', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Recurring',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 60,
        'frequency' => 'daily',
        'interval' => 1,
        'end_count' => 3,
        'start_date' => '2026-03-11',
    ]);

    $task = $series->tasks()->first();

    $this->actingAs($this->user)
        ->post(route('tasks.duplicate', $task), [
            'scheduled_at' => '2026-03-20T10:00:00',
        ])
        ->assertRedirect();

    $duplicate = $this->user->tasks()->whereNull('recurrence_series_id')->where('title', 'Recurring')->first();
    expect($duplicate)->not->toBeNull();
    expect($duplicate->recurrence_series_id)->toBeNull();
});

test('editThisAndFollowing adjusts end_count for the new series', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Daily task',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 30,
        'frequency' => 'daily',
        'interval' => 1,
        'end_count' => 10,
        'start_date' => '2026-03-11',
    ]);

    expect($series->tasks()->count())->toBe(10);

    $taskAtIndex3 = $series->tasks()->where('recurrence_index', 3)->first();

    $newSeries = $this->service->editThisAndFollowing($taskAtIndex3, [
        'title' => 'Updated daily task',
    ]);

    expect($newSeries->end_count)->toBe(7);
    expect($newSeries->tasks()->count())->toBe(7);
    expect($newSeries->tasks()->first()->title)->toBe('Updated daily task');
});

test('editThisAndFollowing reassigns exception tasks to new series', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Original',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 60,
        'frequency' => 'daily',
        'interval' => 1,
        'end_count' => 5,
        'start_date' => '2026-03-11',
    ]);

    // Edit single instance at index 2 to make it an exception
    $exceptionTask = $series->tasks()->where('recurrence_index', 2)->first();
    $this->service->editSingleInstance($exceptionTask, ['title' => 'Exception Edit']);
    $exceptionTask->refresh();
    expect($exceptionTask->is_recurrence_exception)->toBeTrue();
    expect($exceptionTask->recurrence_series_id)->toBe($series->id);

    // Split from index 1 (editThisAndFollowing)
    $splitTask = $series->tasks()->where('recurrence_index', 1)->first();
    $newSeries = $this->service->editThisAndFollowing($splitTask, ['title' => 'Changed']);

    // The exception task at index 2 should now belong to the new series
    $exceptionTask->refresh();
    expect($exceptionTask->recurrence_series_id)->toBe($newSeries->id);
    expect($exceptionTask->is_recurrence_exception)->toBeTrue();
    expect($exceptionTask->title)->toBe('Exception Edit');
});

test('createSeries with existing task converts it instead of duplicating', function () {
    $task = $this->user->tasks()->create([
        'board_id' => $this->board->id,
        'title' => 'Existing meeting',
        'scheduled_at' => '2026-03-11 09:00:00',
        'duration_minutes' => 60,
        'is_completed' => false,
        'position' => 0,
    ]);

    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Existing meeting',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 60,
        'frequency' => 'daily',
        'interval' => 1,
        'end_count' => 5,
        'start_date' => '2026-03-11',
    ], [], [], $task->id);

    $task->refresh();

    expect($task->recurrence_series_id)->toBe($series->id);
    expect($task->recurrence_index)->toBe(0);
    expect($series->tasks()->count())->toBe(5);
    expect(Task::where('user_id', $this->user->id)
        ->whereNull('recurrence_series_id')
        ->where('title', 'Existing meeting')
        ->count()
    )->toBe(0);
});

test('creating recurrence series with existing_task_id via controller converts the task', function () {
    $task = $this->user->tasks()->create([
        'board_id' => $this->board->id,
        'title' => 'My task',
        'scheduled_at' => '2026-03-11 09:00:00',
        'duration_minutes' => 30,
        'is_completed' => false,
        'position' => 0,
    ]);

    $this->actingAs($this->user)
        ->post(route('recurrence-series.store'), [
            'board_id' => $this->board->id,
            'existing_task_id' => $task->id,
            'title' => 'My task',
            'start_date' => '2026-03-11',
            'time_of_day' => '09:00',
            'duration_minutes' => 30,
            'frequency' => 'daily',
            'interval' => 1,
            'end_count' => 3,
        ])
        ->assertRedirect();

    $task->refresh();
    expect($task->recurrence_series_id)->not->toBeNull();
    expect($task->recurrence_index)->toBe(0);
    expect($this->user->tasks()->count())->toBe(3);
});

test('month day clamping works for feb 31st', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Monthly 31st',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 60,
        'frequency' => 'monthly',
        'interval' => 1,
        'month_day' => 31,
        'start_date' => '2026-01-31',
    ]);

    // Check February is clamped to 28
    $febTask = $series->tasks->first(fn (Task $t) => $t->scheduled_at->month === 2);
    if ($febTask) {
        expect($febTask->scheduled_at->day)->toBe(28);
    }
});

// --- Schedule endpoint with recurrence scope ---

test('schedule with recurrence_scope single marks task as exception', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Daily standup',
        'time_of_day' => '09:00',
        'duration_minutes' => 30,
        'frequency' => 'daily',
        'interval' => 1,
        'start_date' => '2026-03-11',
        'end_count' => 5,
    ]);

    $task = $series->tasks()->where('recurrence_index', 2)->first();

    $this->actingAs($this->user)
        ->patch(route('tasks.schedule', $task), [
            'scheduled_at' => '2026-03-13T14:00:00',
            'duration_minutes' => 45,
            'recurrence_scope' => 'single',
        ])
        ->assertRedirect();

    $task->refresh();
    expect($task->is_recurrence_exception)->toBeTrue();
    expect($task->scheduled_at->format('H:i'))->toBe('14:00');
    expect($task->duration_minutes)->toBe(45);
});

test('schedule with recurrence_scope all updates series time and all future instances', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Daily standup',
        'time_of_day' => '09:00',
        'duration_minutes' => 30,
        'frequency' => 'daily',
        'interval' => 1,
        'start_date' => '2026-03-11',
        'end_count' => 5,
    ]);

    $task = $series->tasks()->where('recurrence_index', 1)->first();

    $this->actingAs($this->user)
        ->patch(route('tasks.schedule', $task), [
            'scheduled_at' => '2026-03-12T14:00:00',
            'duration_minutes' => 45,
            'recurrence_scope' => 'all',
        ])
        ->assertRedirect();

    $series->refresh();
    expect($series->time_of_day)->toBe('14:00');
    expect($series->duration_minutes)->toBe(45);

    $futureTasks = $series->tasks()
        ->where('is_recurrence_exception', false)
        ->where('scheduled_at', '>=', now())
        ->get();

    foreach ($futureTasks as $futureTask) {
        expect($futureTask->scheduled_at->format('H:i'))->toBe('14:00');
        expect($futureTask->duration_minutes)->toBe(45);
    }
});

test('schedule with recurrence_scope following splits the series', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Daily standup',
        'time_of_day' => '09:00',
        'duration_minutes' => 30,
        'frequency' => 'daily',
        'interval' => 1,
        'start_date' => '2026-03-11',
        'end_count' => 10,
    ]);

    $task = $series->tasks()->where('recurrence_index', 3)->first();

    $this->actingAs($this->user)
        ->patch(route('tasks.schedule', $task), [
            'scheduled_at' => '2026-03-14T14:00:00',
            'duration_minutes' => 45,
            'recurrence_scope' => 'following',
        ])
        ->assertRedirect();

    // New series should exist with the updated time
    $newSeries = RecurrenceSeries::where('time_of_day', '14:00')->first();
    expect($newSeries)->not->toBeNull();
    expect($newSeries->duration_minutes)->toBe(45);
    expect($newSeries->id)->not->toBe($series->id);
});

// --- Double/triple split scenarios ---

test('editThisAndFollowing double split covers full remaining range', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Daily task',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 30,
        'frequency' => 'daily',
        'interval' => 1,
        'end_count' => 10,
        'start_date' => '2026-03-11',
    ]);

    expect($series->tasks()->count())->toBe(10);

    // First split at index 5: change duration
    $taskAt5 = $series->tasks()->where('recurrence_index', 5)->first();
    $seriesB = $this->service->editThisAndFollowing($taskAt5, ['duration_minutes' => 45]);

    $series->refresh();
    expect($series->tasks()->count())->toBe(5); // indices 0-4
    expect($seriesB->tasks()->count())->toBe(5); // 5 tasks with duration 45
    expect($seriesB->origin_series_id)->toBe($series->id);

    // Second split at index 2: change title
    $taskAt2 = $series->tasks()->where('recurrence_index', 2)->first();
    $seriesC = $this->service->editThisAndFollowing($taskAt2, ['title' => 'Updated']);

    $series->refresh();
    expect($series->tasks()->count())->toBe(2); // indices 0-1
    expect($seriesC->tasks()->count())->toBe(8); // indices 2-9 equivalent
    expect($seriesC->origin_series_id)->toBe($series->id);
    $seriesC->tasks->each(fn (Task $t) => expect($t->title)->toBe('Updated'));

    // Series B should be deleted
    expect(RecurrenceSeries::find($seriesB->id))->toBeNull();

    // Total user tasks should still be 10
    expect($this->user->tasks()->count())->toBe(10);
});

test('deleteThisAndFollowing double split cascades to successor series', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Daily task',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 30,
        'frequency' => 'daily',
        'interval' => 1,
        'end_count' => 10,
        'start_date' => '2026-03-11',
    ]);

    // First split at index 5
    $taskAt5 = $series->tasks()->where('recurrence_index', 5)->first();
    $seriesB = $this->service->editThisAndFollowing($taskAt5, ['duration_minutes' => 45]);

    // Delete "this and following" at index 2 of original series
    $taskAt2 = $series->tasks()->where('recurrence_index', 2)->first();
    $this->service->deleteThisAndFollowing($taskAt2);

    $series->refresh();
    expect($series->tasks()->count())->toBe(2); // indices 0-1
    expect(RecurrenceSeries::find($seriesB->id))->toBeNull();
    expect($this->user->tasks()->count())->toBe(2);
});

test('editThisAndFollowing triple split resolves correctly', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Daily task',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 30,
        'frequency' => 'daily',
        'interval' => 1,
        'end_count' => 15,
        'start_date' => '2026-03-11',
    ]);

    // Split at index 10
    $taskAt10 = $series->tasks()->where('recurrence_index', 10)->first();
    $seriesB = $this->service->editThisAndFollowing($taskAt10, ['title' => 'B']);

    // Split at index 5
    $taskAt5 = $series->tasks()->where('recurrence_index', 5)->first();
    $seriesC = $this->service->editThisAndFollowing($taskAt5, ['title' => 'C']);

    $series->refresh();
    expect($series->tasks()->count())->toBe(5); // indices 0-4
    expect($seriesC->tasks()->count())->toBe(10); // indices 5-14
    expect(RecurrenceSeries::find($seriesB->id))->toBeNull();

    // Split at index 2
    $taskAt2 = $series->tasks()->where('recurrence_index', 2)->first();
    $seriesD = $this->service->editThisAndFollowing($taskAt2, ['title' => 'D']);

    $series->refresh();
    expect($series->tasks()->count())->toBe(2); // indices 0-1
    expect($seriesD->tasks()->count())->toBe(13); // indices 2-14
    expect(RecurrenceSeries::find($seriesC->id))->toBeNull();
    expect($this->user->tasks()->count())->toBe(15);
});

test('editAllInstances applies changes across split series', function () {
    Carbon::setTestNow('2026-03-11 06:00:00');

    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Daily task',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 30,
        'frequency' => 'daily',
        'interval' => 1,
        'end_count' => 10,
        'start_date' => '2026-03-11',
    ]);

    // Split at index 5
    $taskAt5 = $series->tasks()->where('recurrence_index', 5)->first();
    $seriesB = $this->service->editThisAndFollowing($taskAt5, ['duration_minutes' => 45]);

    // Edit all from the original series
    $this->service->editAllInstances($series, ['title' => 'Updated All']);

    $series->refresh();
    $seriesB->refresh();

    expect($series->title)->toBe('Updated All');
    expect($seriesB->title)->toBe('Updated All');

    // All non-exception future tasks across both series should be updated
    $allTasks = $this->user->tasks()
        ->where('is_recurrence_exception', false)
        ->where('scheduled_at', '>=', now())
        ->get();

    $allTasks->each(fn (Task $t) => expect($t->title)->toBe('Updated All'));
});

test('deleteAllInstances removes all split series', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Daily task',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 30,
        'frequency' => 'daily',
        'interval' => 1,
        'end_count' => 10,
        'start_date' => '2026-03-11',
    ]);

    // Split at index 5
    $taskAt5 = $series->tasks()->where('recurrence_index', 5)->first();
    $seriesB = $this->service->editThisAndFollowing($taskAt5, ['duration_minutes' => 45]);

    $seriesBId = $seriesB->id;

    // Delete all from the original series
    $this->service->deleteAllInstances($series);

    expect(RecurrenceSeries::find($series->id))->toBeNull();
    expect(RecurrenceSeries::find($seriesBId))->toBeNull();
    expect($this->user->tasks()->count())->toBe(0);
});

test('editThisAndFollowing double split with end_date covers full date range', function () {
    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Daily task',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 30,
        'frequency' => 'daily',
        'interval' => 1,
        'end_date' => '2026-03-30',
        'start_date' => '2026-03-11',
    ]);

    $totalTasks = $series->tasks()->count(); // 20 days
    expect($totalTasks)->toBe(20);

    // Split at index 15 (Mar 26)
    $taskAt15 = $series->tasks()->where('recurrence_index', 15)->first();
    $seriesB = $this->service->editThisAndFollowing($taskAt15, ['duration_minutes' => 45]);

    // Split at index 5 (Mar 16)
    $taskAt5 = $series->tasks()->where('recurrence_index', 5)->first();
    $seriesC = $this->service->editThisAndFollowing($taskAt5, ['title' => 'Updated']);

    $series->refresh();
    expect($series->tasks()->count())->toBe(5);
    expect($seriesC->tasks()->count())->toBe(15);
    expect($seriesC->end_date->toDateString())->toBe('2026-03-30');
    expect(RecurrenceSeries::find($seriesB->id))->toBeNull();
    expect($this->user->tasks()->count())->toBe(20);
});

test('editAllInstances with frequency change regenerates future instances', function () {
    Carbon::setTestNow('2026-03-11 06:00:00');

    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Daily task',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 30,
        'frequency' => 'daily',
        'interval' => 1,
        'start_date' => '2026-03-11',
    ]);

    $initialCount = $series->tasks()->count();

    // Change from daily to weekly
    $this->service->editAllInstances($series, ['frequency' => 'weekly']);

    $series->refresh();
    expect($series->frequency)->toBe('weekly');

    // Weekly tasks should be far fewer than daily tasks
    $tasks = $series->tasks()->orderBy('scheduled_at')->get();
    expect($tasks->count())->toBeGreaterThan(0);
    expect($tasks->count())->toBeLessThan($initialCount);

    // All regenerated tasks should fall on the same day of the week
    $days = $tasks->map(fn (Task $t) => $t->scheduled_at->dayOfWeekIso)->unique();
    expect($days->count())->toBe(1);
});

test('editAllInstances with rule change preserves completed tasks', function () {
    Carbon::setTestNow('2026-03-11 06:00:00');

    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Daily task',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 30,
        'frequency' => 'daily',
        'interval' => 1,
        'start_date' => '2026-03-11',
        'end_count' => 10,
    ]);

    // Mark first task as completed
    $firstTask = $series->tasks()->where('recurrence_index', 0)->first();
    $firstTask->update(['is_completed' => true]);

    // Change frequency
    $this->service->editAllInstances($series, ['frequency' => 'weekly']);

    // Completed task should still exist
    expect(Task::find($firstTask->id))->not->toBeNull();
    expect(Task::find($firstTask->id)->is_completed)->toBeTrue();
});

test('editAllInstances with rule change preserves exception tasks', function () {
    Carbon::setTestNow('2026-03-11 06:00:00');

    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Daily task',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 30,
        'frequency' => 'daily',
        'interval' => 1,
        'start_date' => '2026-03-11',
        'end_count' => 10,
    ]);

    // Create an exception at index 2
    $exceptionTask = $series->tasks()->where('recurrence_index', 2)->first();
    $this->service->editSingleInstance($exceptionTask, ['title' => 'My Exception']);

    // Change frequency
    $this->service->editAllInstances($series, ['frequency' => 'weekly']);

    // Exception task should still exist with its custom title
    $exceptionTask->refresh();
    expect($exceptionTask->is_recurrence_exception)->toBeTrue();
    expect($exceptionTask->title)->toBe('My Exception');
});

test('editAllInstances with rule change propagates across split series', function () {
    Carbon::setTestNow('2026-03-11 06:00:00');

    $series = $this->service->createSeries($this->user, [
        'board_id' => $this->board->id,
        'title' => 'Daily task',
        'description' => null,
        'time_of_day' => '09:00',
        'duration_minutes' => 30,
        'frequency' => 'daily',
        'interval' => 1,
        'end_count' => 10,
        'start_date' => '2026-03-11',
    ]);

    $totalBefore = $this->user->tasks()->count();

    // Split at index 5
    $taskAt5 = $series->tasks()->where('recurrence_index', 5)->first();
    $seriesB = $this->service->editThisAndFollowing($taskAt5, ['duration_minutes' => 45]);

    // Change interval on all via the original series (daily every 3 days instead of every day)
    $this->service->editAllInstances($series, ['interval' => 3]);

    $series->refresh();
    $seriesB->refresh();

    expect($series->interval)->toBe(3);
    expect($seriesB->interval)->toBe(3);

    // Verify tasks in each series have correct 3-day spacing
    foreach ([$series, $seriesB] as $s) {
        $dates = $s->tasks()
            ->where('is_recurrence_exception', false)
            ->where('is_completed', false)
            ->orderBy('scheduled_at')
            ->pluck('scheduled_at')
            ->map(fn ($d) => Carbon::parse($d)->toDateString())
            ->values()
            ->all();

        for ($i = 1; $i < count($dates); $i++) {
            $diff = Carbon::parse($dates[$i - 1])->diffInDays(Carbon::parse($dates[$i]));
            expect((int) $diff)->toBe(3);
        }
    }
});

test('schedule without scope on non-recurring task works normally', function () {
    $task = $this->user->tasks()->create([
        'board_id' => $this->board->id,
        'title' => 'One-off task',
        'scheduled_at' => '2026-03-11 09:00:00',
        'duration_minutes' => 30,
        'is_completed' => false,
        'position' => 0,
    ]);

    $this->actingAs($this->user)
        ->patch(route('tasks.schedule', $task), [
            'scheduled_at' => '2026-03-12T14:00:00',
            'duration_minutes' => 60,
        ])
        ->assertRedirect();

    $task->refresh();
    expect($task->scheduled_at->format('H:i'))->toBe('14:00');
    expect($task->duration_minutes)->toBe(60);
});
