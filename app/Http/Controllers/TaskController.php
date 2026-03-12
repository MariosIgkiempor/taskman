<?php

namespace App\Http\Controllers;

use App\Http\Requests\Task\DuplicateTaskRequest;
use App\Http\Requests\Task\ScheduleTaskRequest;
use App\Http\Requests\Task\StoreTaskRequest;
use App\Http\Requests\Task\UpdateTaskRequest;
use App\Models\Task;
use App\Models\Workspace;
use App\Notifications\TaskReminderNotification;
use App\Services\RecurrenceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class TaskController extends Controller
{
    public function index(Request $request, Workspace $workspace): Response
    {
        Gate::authorize('view', $workspace);

        $weekStart = Carbon::parse(
            $request->validate(['week' => 'sometimes|date'])['week'] ?? now()
        )->startOfWeek();

        $weekEnd = $weekStart->copy()->endOfWeek();
        if ($weekEnd->gt(now())) {
            app(RecurrenceService::class)->extendSeriesForUser($request->user(), $weekEnd);
        }

        return Inertia::render('tasks/index', [
            'workspace' => $workspace,
            'boards' => $workspace->boards()->orderBy('position')->get(),
            'unscheduledTasks' => $workspace->tasks()->with(['tags', 'reminders', 'recurrenceSeries'])->unscheduled()->where('is_completed', false)->orderBy('position')->orderBy('created_at', 'desc')->get(),
            'scheduledTasks' => $workspace->tasks()->with(['tags', 'reminders', 'recurrenceSeries'])->scheduled()->forWeek($weekStart)->orderBy('scheduled_at')->get(),
            'completedTasks' => $workspace->tasks()->with(['tags', 'reminders', 'recurrenceSeries'])->where('is_completed', true)->latest()->get(),
            'currentWeekStart' => $weekStart->toDateString(),
            'tags' => $workspace->tags()->orderBy('name')->get(),
        ]);
    }

    public function store(StoreTaskRequest $request, Workspace $workspace): RedirectResponse
    {
        $validated = $request->validated();
        $tagIds = $validated['tag_ids'] ?? [];
        unset($validated['tag_ids']);

        $task = $request->user()->tasks()->create($validated);

        if ($tagIds) {
            $task->tags()->sync($tagIds);
        }

        return back();
    }

    public function update(UpdateTaskRequest $request, Task $task): RedirectResponse
    {
        $validated = $request->validated();
        $scope = $validated['recurrence_scope'] ?? null;
        unset($validated['recurrence_scope']);

        if ($task->isRecurring() && $scope) {
            $service = app(RecurrenceService::class);
            match ($scope) {
                'single' => $service->editSingleInstance($task, $validated),
                'following' => $service->editThisAndFollowing($task, $validated),
                'all' => $service->editAllInstances($task->recurrenceSeries, $validated),
            };

            return back();
        }

        $task->update($validated);

        if ($task->is_completed) {
            $this->clearRemindersAndNotifications($task);
        }

        return back();
    }

    public function schedule(ScheduleTaskRequest $request, Task $task): RedirectResponse
    {
        $validated = $request->validated();
        $scope = $validated['recurrence_scope'] ?? null;
        unset($validated['recurrence_scope']);

        if ($task->isRecurring() && $scope) {
            $service = app(RecurrenceService::class);

            if ($scope === 'all') {
                $seriesChanges = [];
                if (isset($validated['scheduled_at'])) {
                    $seriesChanges['time_of_day'] = Carbon::parse($validated['scheduled_at'])->format('H:i');
                }
                if (isset($validated['duration_minutes'])) {
                    $seriesChanges['duration_minutes'] = $validated['duration_minutes'];
                }
                $service->editAllInstances($task->recurrenceSeries, $seriesChanges);
            } else {
                match ($scope) {
                    'single' => $service->editSingleInstance($task, $validated),
                    'following' => $service->editThisAndFollowing($task, $validated),
                };
            }

            return back();
        }

        $task->update($validated);

        return back();
    }

    public function duplicate(DuplicateTaskRequest $request, Task $task): RedirectResponse
    {
        $newTask = $task->replicate();
        $newTask->scheduled_at = $request->validated('scheduled_at');
        $newTask->is_completed = false;
        $newTask->recurrence_series_id = null;
        $newTask->recurrence_index = null;
        $newTask->is_recurrence_exception = false;
        $request->user()->tasks()->save($newTask);

        $newTask->tags()->sync($task->tags->pluck('id'));

        return back();
    }

    public function unschedule(Task $task): RedirectResponse
    {
        Gate::authorize('update', $task);

        $task->update([
            'scheduled_at' => null,
            'recurrence_series_id' => null,
            'recurrence_index' => null,
            'is_recurrence_exception' => false,
        ]);
        $this->clearRemindersAndNotifications($task);

        return back();
    }

    public function destroy(Request $request, Task $task): RedirectResponse
    {
        Gate::authorize('delete', $task);

        $scope = $request->input('recurrence_scope');

        if ($task->isRecurring() && $scope) {
            $service = app(RecurrenceService::class);
            match ($scope) {
                'single' => $service->deleteSingleInstance($task),
                'following' => $service->deleteThisAndFollowing($task),
                'all' => $service->deleteAllInstances($task->recurrenceSeries),
            };

            return back();
        }

        $this->clearNotifications($task);
        $task->delete();

        return back();
    }

    private function clearRemindersAndNotifications(Task $task): void
    {
        $task->reminders()->delete();
        $this->clearNotifications($task);
    }

    private function clearNotifications(Task $task): void
    {
        $task->user->notifications()
            ->where('type', TaskReminderNotification::class)
            ->whereRaw("json_extract(data, '$.task_id') = ?", [$task->id])
            ->delete();
    }
}
