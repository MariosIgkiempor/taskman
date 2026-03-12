<?php

namespace App\Services;

use App\Models\RecurrenceSeries;
use App\Models\Task;
use App\Models\User;
use Carbon\CarbonInterface;
use Generator;
use Illuminate\Support\Carbon;

class RecurrenceService
{
    public function createSeries(User $user, array $seriesData, array $tagIds = [], array $reminderMinutes = [], ?int $existingTaskId = null, ?int $originSeriesId = null): RecurrenceSeries
    {
        $series = $user->recurrenceSeries()->create(array_merge($seriesData, [
            'generated_until' => Carbon::parse($seriesData['start_date'])->subDay(),
            'next_index' => 0,
            'origin_series_id' => $originSeriesId,
        ]));

        if ($tagIds) {
            $series->tags()->sync($tagIds);
        }

        foreach ($reminderMinutes as $minutes) {
            $series->reminders()->create(['minutes_before' => $minutes]);
        }

        if ($existingTaskId) {
            $existingTask = Task::findOrFail($existingTaskId);
            $existingTask->update([
                'recurrence_series_id' => $series->id,
                'recurrence_index' => 0,
                'is_recurrence_exception' => false,
            ]);
            $series->update([
                'next_index' => 1,
                'generated_until' => Carbon::parse($seriesData['start_date']),
            ]);
        }

        $horizon = Carbon::parse(now())->addWeeks(12);
        $this->generateInstances($series, $horizon);

        return $series;
    }

    public function generateInstances(RecurrenceSeries $series, CarbonInterface $horizon): int
    {
        $from = Carbon::parse($series->generated_until)->addDay();
        $until = Carbon::parse($horizon);

        if ($series->end_date && Carbon::parse($series->end_date)->lt($until)) {
            $until = Carbon::parse($series->end_date);
        }

        if ($from->gt($until)) {
            return 0;
        }

        $seriesTagIds = $series->tags()->pluck('tags.id')->all();
        $seriesReminders = $series->reminders()->pluck('minutes_before')->all();
        $count = 0;

        foreach ($this->iterateOccurrences($series, $from, $until) as $date) {
            if ($series->end_count !== null && $series->next_index >= $series->end_count) {
                break;
            }

            $scheduledAt = $date->copy()->setTimeFromTimeString($series->time_of_day);

            $task = new Task([
                'title' => $series->title,
                'description' => $series->description,
                'scheduled_at' => $scheduledAt,
                'duration_minutes' => $series->duration_minutes,
                'is_completed' => false,
                'position' => 0,
                'location' => $series->location,
                'location_coordinates' => $series->location_coordinates,
                'board_id' => $series->board_id,
                'recurrence_series_id' => $series->id,
                'recurrence_index' => $series->next_index,
            ]);
            $series->user->tasks()->save($task);

            if ($seriesTagIds) {
                $task->tags()->sync($seriesTagIds);
            }

            foreach ($seriesReminders as $minutes) {
                $task->reminders()->create(['minutes_before' => $minutes]);
            }

            $series->next_index++;
            $count++;
        }

        $series->generated_until = $until;
        $series->save();

        return $count;
    }

    /**
     * @return Generator<int, Carbon>
     */
    public function iterateOccurrences(RecurrenceSeries $series, CarbonInterface $from, CarbonInterface $until): Generator
    {
        $startDate = Carbon::parse($series->start_date)->startOfDay();
        $interval = max(1, $series->interval);
        $frequency = $series->frequency;

        match ($frequency) {
            'daily' => yield from $this->iterateDaily($startDate, $interval, $from, $until),
            'weekly' => yield from $this->iterateWeekly($startDate, $interval, $series->days_of_week, $from, $until),
            'monthly' => yield from $this->iterateMonthly($startDate, $interval, $series->month_day, $series->month_week_ordinal, $series->month_week_day, $from, $until),
            'yearly' => yield from $this->iterateYearly($startDate, $interval, $from, $until),
        };
    }

    /**
     * @return Generator<int, Carbon>
     */
    private function iterateDaily(CarbonInterface $startDate, int $interval, CarbonInterface $from, CarbonInterface $until): Generator
    {
        $current = $startDate->copy();

        if ($current->lt($from)) {
            $daysDiff = $current->diffInDays($from);
            $periodsToSkip = intdiv($daysDiff, $interval);
            $current->addDays($periodsToSkip * $interval);
            if ($current->lt($from)) {
                $current->addDays($interval);
            }
        }

        while ($current->lte($until)) {
            yield $current->copy();
            $current->addDays($interval);
        }
    }

    /**
     * @return Generator<int, Carbon>
     */
    private function iterateWeekly(CarbonInterface $startDate, int $interval, ?array $daysOfWeek, CarbonInterface $from, CarbonInterface $until): Generator
    {
        if ($daysOfWeek === null || $daysOfWeek === []) {
            $daysOfWeek = [$startDate->dayOfWeekIso];
        }

        sort($daysOfWeek);

        $weekStart = $startDate->copy()->startOfWeek(Carbon::MONDAY);
        $fromWeekStart = $from->copy()->startOfWeek(Carbon::MONDAY);

        if ($weekStart->lt($fromWeekStart)) {
            $weeksDiff = $weekStart->diffInWeeks($fromWeekStart);
            $periodsToSkip = intdiv($weeksDiff, $interval);
            $weekStart->addWeeks($periodsToSkip * $interval);
            if ($weekStart->lt($fromWeekStart)) {
                $weekStart->addWeeks($interval);
            }
            // Back up one interval in case the target week has days >= $from
            $weekStart->subWeeks($interval);
        }

        while ($weekStart->lte($until)) {
            foreach ($daysOfWeek as $day) {
                $date = $weekStart->copy()->startOfWeek(Carbon::MONDAY)->addDays($day - 1);
                if ($date->gte($from) && $date->lte($until) && $date->gte($startDate)) {
                    yield $date;
                }
            }
            $weekStart->addWeeks($interval);
        }
    }

    /**
     * @return Generator<int, Carbon>
     */
    private function iterateMonthly(CarbonInterface $startDate, int $interval, ?int $monthDay, ?int $ordinal, ?int $weekDay, CarbonInterface $from, CarbonInterface $until): Generator
    {
        if ($ordinal !== null && $weekDay !== null) {
            yield from $this->iterateMonthlyOrdinal($startDate, $interval, $ordinal, $weekDay, $from, $until);
        } else {
            $day = $monthDay ?? $startDate->day;
            yield from $this->iterateMonthlyDay($startDate, $interval, $day, $from, $until);
        }
    }

    /**
     * @return Generator<int, Carbon>
     */
    private function iterateMonthlyDay(CarbonInterface $startDate, int $interval, int $day, CarbonInterface $from, CarbonInterface $until): Generator
    {
        $current = $startDate->copy()->startOfMonth();

        if ($current->lt($from->copy()->startOfMonth())) {
            $monthsDiff = ($from->year - $current->year) * 12 + ($from->month - $current->month);
            $periodsToSkip = intdiv($monthsDiff, $interval);
            $current->addMonths($periodsToSkip * $interval);
            if ($current->lt($from->copy()->startOfMonth())) {
                $current->addMonths($interval);
            }
            // Back up one interval to avoid missing the from month
            $current->subMonths($interval);
        }

        while ($current->lte($until)) {
            $clampedDay = min($day, $current->daysInMonth);
            $date = $current->copy()->setDay($clampedDay);
            if ($date->gte($from) && $date->lte($until) && $date->gte($startDate)) {
                yield $date;
            }
            $current->addMonths($interval);
        }
    }

    /**
     * @return Generator<int, Carbon>
     */
    private function iterateMonthlyOrdinal(CarbonInterface $startDate, int $interval, int $ordinal, int $weekDay, CarbonInterface $from, CarbonInterface $until): Generator
    {
        $current = $startDate->copy()->startOfMonth();

        if ($current->lt($from->copy()->startOfMonth())) {
            $monthsDiff = ($from->year - $current->year) * 12 + ($from->month - $current->month);
            $periodsToSkip = intdiv($monthsDiff, $interval);
            $current->addMonths($periodsToSkip * $interval);
            if ($current->lt($from->copy()->startOfMonth())) {
                $current->addMonths($interval);
            }
            $current->subMonths($interval);
        }

        while ($current->lte($until)) {
            $date = $this->nthWeekdayOfMonth($current->year, $current->month, $ordinal, $weekDay);
            if ($date && $date->gte($from) && $date->lte($until) && $date->gte($startDate)) {
                yield $date;
            }
            $current->addMonths($interval);
        }
    }

    private function nthWeekdayOfMonth(int $year, int $month, int $ordinal, int $weekDay): ?Carbon
    {
        $first = Carbon::create($year, $month, 1);
        $firstTarget = $first->copy();

        if ($firstTarget->dayOfWeekIso !== $weekDay) {
            $diff = ($weekDay - $firstTarget->dayOfWeekIso + 7) % 7;
            $firstTarget->addDays($diff);
        }

        $date = $firstTarget->copy()->addWeeks($ordinal - 1);

        if ($date->month !== $month) {
            return null;
        }

        return $date;
    }

    /**
     * @return Generator<int, Carbon>
     */
    private function iterateYearly(CarbonInterface $startDate, int $interval, CarbonInterface $from, CarbonInterface $until): Generator
    {
        $current = $startDate->copy();

        if ($current->lt($from)) {
            $yearsDiff = $from->year - $current->year;
            $periodsToSkip = intdiv($yearsDiff, $interval);
            $current->addYears($periodsToSkip * $interval);
            if ($current->lt($from)) {
                $current->addYears($interval);
            }
        }

        while ($current->lte($until)) {
            yield $current->copy();
            $current->addYears($interval);
        }
    }

    public function editSingleInstance(Task $task, array $changes): Task
    {
        $task->update(array_merge($changes, [
            'is_recurrence_exception' => true,
        ]));

        return $task;
    }

    public function editThisAndFollowing(Task $task, array $changes, array $tagIds = []): RecurrenceSeries
    {
        $series = $task->recurrenceSeries;
        $splitIndex = $task->recurrence_index;

        // Capture original values before modifying the series
        $originalEndDate = $series->end_date?->toDateString();
        $originalEndCount = $series->end_count;
        $newEndCount = null;

        // Find and absorb successor series from previous splits
        $originId = $series->origin_series_id ?? $series->id;
        $successorSeries = RecurrenceSeries::where('id', '!=', $series->id)
            ->where('origin_series_id', $originId)
            ->where('start_date', '>=', $task->scheduled_at->toDateString())
            ->orderByDesc('start_date')
            ->get();

        if ($successorSeries->isNotEmpty()) {
            $lastSuccessor = $successorSeries->first();

            // Use the furthest successor's end conditions as the true end boundary
            if (! array_key_exists('end_date', $changes)) {
                $originalEndDate = $lastSuccessor->end_date?->toDateString();
            }
            if (! array_key_exists('end_count', $changes) && $originalEndCount !== null) {
                // Total remaining = tasks in current series from split onward + all tasks in successor series
                $remainingInCurrent = $series->tasks()
                    ->where('recurrence_index', '>=', $splitIndex)
                    ->where('is_recurrence_exception', false)
                    ->count();
                $successorTaskCount = 0;
                foreach ($successorSeries as $successor) {
                    $successorTaskCount += $successor->tasks()->where('is_recurrence_exception', false)->count();
                }
                // This is the exact count for the new series (already accounts for the split point)
                $newEndCount = $remainingInCurrent + $successorTaskCount;
            }

            // Delete successor series and their associated data
            foreach ($successorSeries as $successor) {
                $successor->tasks()->delete();
                $successor->reminders()->delete();
                $successor->tags()->detach();
                $successor->delete();
            }
        }

        // Delete future non-exception instances at or after the split point
        $series->tasks()
            ->where('recurrence_index', '>=', $splitIndex)
            ->where('is_recurrence_exception', false)
            ->delete();

        // Recalculate series state based on remaining tasks
        $lastTask = $series->tasks()->orderByDesc('recurrence_index')->first();
        if ($lastTask) {
            $series->end_date = $task->scheduled_at->copy()->subDay()->toDateString();
            $series->generated_until = $lastTask->scheduled_at->toDateString();
            $series->next_index = $lastTask->recurrence_index + 1;
            $series->save();
        } else {
            $series->delete();
        }

        // If scheduled_at is in changes, extract start_date and time_of_day from it
        $newStartDate = $task->scheduled_at->toDateString();
        $newTimeOfDay = $changes['time_of_day'] ?? $series->time_of_day;

        if (isset($changes['scheduled_at'])) {
            $parsedScheduledAt = Carbon::parse($changes['scheduled_at']);
            $newStartDate = $parsedScheduledAt->toDateString();
            $newTimeOfDay = $parsedScheduledAt->format('H:i');
            unset($changes['scheduled_at']);
        }

        // Build new series data with applied changes (use original/successor end conditions)
        $newSeriesData = [
            'board_id' => $series->board_id,
            'title' => $changes['title'] ?? $series->title,
            'description' => array_key_exists('description', $changes) ? $changes['description'] : $series->description,
            'time_of_day' => $newTimeOfDay,
            'duration_minutes' => $changes['duration_minutes'] ?? $series->duration_minutes,
            'location' => array_key_exists('location', $changes) ? $changes['location'] : $series->location,
            'location_coordinates' => array_key_exists('location_coordinates', $changes) ? $changes['location_coordinates'] : $series->location_coordinates,
            'frequency' => $changes['frequency'] ?? $series->frequency,
            'interval' => $changes['interval'] ?? $series->interval,
            'days_of_week' => array_key_exists('days_of_week', $changes) ? $changes['days_of_week'] : $series->days_of_week,
            'month_day' => array_key_exists('month_day', $changes) ? $changes['month_day'] : $series->month_day,
            'month_week_ordinal' => array_key_exists('month_week_ordinal', $changes) ? $changes['month_week_ordinal'] : $series->month_week_ordinal,
            'month_week_day' => array_key_exists('month_week_day', $changes) ? $changes['month_week_day'] : $series->month_week_day,
            'end_date' => array_key_exists('end_date', $changes) ? $changes['end_date'] : $originalEndDate,
            'end_count' => array_key_exists('end_count', $changes) ? $changes['end_count'] : ($newEndCount ?? ($originalEndCount !== null ? $originalEndCount - $splitIndex : null)),
            'start_date' => $newStartDate,
        ];

        $seriesTagIds = $tagIds ?: $series->tags()->pluck('tags.id')->all();
        $reminderMinutes = $series->reminders()->pluck('minutes_before')->all();

        $newSeries = $this->createSeries($series->user, $newSeriesData, $seriesTagIds, $reminderMinutes, originSeriesId: $originId);

        // Re-assign orphaned exception tasks from the old series to the new series
        $series->tasks()
            ->where('recurrence_index', '>=', $splitIndex)
            ->where('is_recurrence_exception', true)
            ->update(['recurrence_series_id' => $newSeries->id]);

        return $newSeries;
    }

    public function editAllInstances(RecurrenceSeries $series, array $changes, array $tagIds = []): void
    {
        // Collect all series in the same lineage
        $allSeries = $this->getAllRelatedSeries($series);

        $seriesUpdates = [];
        $taskUpdates = [];

        foreach (['title', 'description', 'location', 'location_coordinates'] as $field) {
            if (array_key_exists($field, $changes)) {
                $seriesUpdates[$field] = $changes[$field];
                $taskUpdates[$field] = $changes[$field];
            }
        }

        if (isset($changes['duration_minutes'])) {
            $seriesUpdates['duration_minutes'] = $changes['duration_minutes'];
            $taskUpdates['duration_minutes'] = $changes['duration_minutes'];
        }

        if (isset($changes['time_of_day'])) {
            $seriesUpdates['time_of_day'] = $changes['time_of_day'];
        }

        foreach ($allSeries as $relatedSeries) {
            if ($seriesUpdates) {
                $relatedSeries->update($seriesUpdates);
            }

            // Update all future non-exception, non-completed instances
            $query = $relatedSeries->tasks()
                ->where('is_recurrence_exception', false)
                ->where('is_completed', false)
                ->where('scheduled_at', '>=', now());

            if ($taskUpdates) {
                $query->update($taskUpdates);
            }

            // If time_of_day changed, update scheduled_at on future instances
            if (isset($changes['time_of_day'])) {
                $futureTasks = $relatedSeries->tasks()
                    ->where('is_recurrence_exception', false)
                    ->where('is_completed', false)
                    ->where('scheduled_at', '>=', now())
                    ->get();

                foreach ($futureTasks as $task) {
                    $newScheduledAt = $task->scheduled_at->copy()->setTimeFromTimeString($changes['time_of_day']);
                    $task->update(['scheduled_at' => $newScheduledAt]);
                }
            }

            if ($tagIds) {
                $relatedSeries->tags()->sync($tagIds);

                $futureTasks = $relatedSeries->tasks()
                    ->where('is_recurrence_exception', false)
                    ->where('is_completed', false)
                    ->where('scheduled_at', '>=', now())
                    ->get();

                foreach ($futureTasks as $task) {
                    $task->tags()->sync($tagIds);
                }
            }
        }
    }

    public function deleteSingleInstance(Task $task): void
    {
        $task->delete();
    }

    public function deleteThisAndFollowing(Task $task): void
    {
        $series = $task->recurrenceSeries;
        $splitIndex = $task->recurrence_index;

        // Find and delete successor series from previous splits
        $originId = $series->origin_series_id ?? $series->id;
        $successorSeries = RecurrenceSeries::where('id', '!=', $series->id)
            ->where('origin_series_id', $originId)
            ->where('start_date', '>=', $task->scheduled_at->toDateString())
            ->get();

        foreach ($successorSeries as $successor) {
            $successor->tasks()->delete();
            $successor->reminders()->delete();
            $successor->tags()->detach();
            $successor->delete();
        }

        // Delete all instances at or after the split point
        $series->tasks()
            ->where('recurrence_index', '>=', $splitIndex)
            ->delete();

        $lastTask = $series->tasks()->orderByDesc('recurrence_index')->first();
        if ($lastTask) {
            $series->end_date = $task->scheduled_at->copy()->subDay()->toDateString();
            $series->generated_until = $lastTask->scheduled_at->toDateString();
            $series->next_index = $lastTask->recurrence_index + 1;
            $series->save();
        } else {
            $series->delete();
        }
    }

    public function deleteAllInstances(RecurrenceSeries $series): void
    {
        $allSeries = $this->getAllRelatedSeries($series);

        foreach ($allSeries as $relatedSeries) {
            $relatedSeries->tasks()->delete();
            $relatedSeries->reminders()->delete();
            $relatedSeries->tags()->detach();
            $relatedSeries->delete();
        }
    }

    public function extendSeriesForUser(User $user, CarbonInterface $targetDate): int
    {
        $horizon = Carbon::parse($targetDate)->addWeeks(4);
        $totalGenerated = 0;

        $user->recurrenceSeries()
            ->where('generated_until', '<', $horizon->toDateString())
            ->where(function ($q) {
                $q->whereNull('end_date')
                    ->orWhere('end_date', '>', now()->toDateString());
            })
            ->each(function (RecurrenceSeries $series) use ($horizon, &$totalGenerated) {
                $totalGenerated += $this->generateInstances($series, $horizon);
            });

        return $totalGenerated;
    }

    public function extendAllSeries(int $weeksAhead = 12): int
    {
        $horizon = Carbon::parse(now())->addWeeks($weeksAhead);
        $totalGenerated = 0;

        RecurrenceSeries::query()
            ->where('generated_until', '<', $horizon->toDateString())
            ->where(function ($q) {
                $q->whereNull('end_date')
                    ->orWhere('end_date', '>', now()->toDateString());
            })
            ->each(function (RecurrenceSeries $series) use ($horizon, &$totalGenerated) {
                $totalGenerated += $this->generateInstances($series, $horizon);
            });

        return $totalGenerated;
    }

    /**
     * Get all series in the same lineage (the given series plus any derived from the same origin).
     *
     * @return \Illuminate\Support\Collection<int, RecurrenceSeries>
     */
    private function getAllRelatedSeries(RecurrenceSeries $series): \Illuminate\Support\Collection
    {
        $originId = $series->origin_series_id ?? $series->id;

        $related = RecurrenceSeries::where('origin_series_id', $originId)->get();

        // Include the origin series itself if it still exists
        $origin = $originId === $series->id ? $series : RecurrenceSeries::find($originId);
        if ($origin) {
            $related->prepend($origin);
        }

        return $related->unique('id');
    }
}
