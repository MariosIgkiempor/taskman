<?php

namespace App\Http\Controllers;

use App\Http\Requests\Task\DuplicateTaskRequest;
use App\Http\Requests\Task\ScheduleTaskRequest;
use App\Http\Requests\Task\StoreTaskRequest;
use App\Http\Requests\Task\UpdateTaskRequest;
use App\Models\Task;
use App\Notifications\TaskReminderNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class TaskController extends Controller
{
    public function index(Request $request): Response
    {
        $user = auth()->user();
        $weekStart = Carbon::parse(
            $request->validate(['week' => 'sometimes|date'])['week'] ?? now()
        )->startOfWeek();

        return Inertia::render('tasks/index', [
            'unscheduledTasks' => $user->tasks()->with(['tags', 'reminders'])->unscheduled()->where('is_completed', false)->orderBy('position')->orderBy('created_at', 'desc')->get(),
            'scheduledTasks' => $user->tasks()->with(['tags', 'reminders'])->scheduled()->forWeek($weekStart)->orderBy('scheduled_at')->get(),
            'completedTasks' => $user->tasks()->with(['tags', 'reminders'])->where('is_completed', true)->latest()->get(),
            'currentWeekStart' => $weekStart->toDateString(),
            'tags' => $user->tags()->orderBy('name')->get(),
        ]);
    }

    public function store(StoreTaskRequest $request): RedirectResponse
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
        $task->update($request->validated());

        if ($task->is_completed) {
            $this->clearRemindersAndNotifications($task);
        }

        return back();
    }

    public function schedule(ScheduleTaskRequest $request, Task $task): RedirectResponse
    {
        $task->update($request->validated());

        return back();
    }

    public function duplicate(DuplicateTaskRequest $request, Task $task): RedirectResponse
    {
        $newTask = $task->replicate();
        $newTask->scheduled_at = $request->validated('scheduled_at');
        $newTask->is_completed = false;
        $request->user()->tasks()->save($newTask);

        $newTask->tags()->sync($task->tags->pluck('id'));

        return back();
    }

    public function unschedule(Task $task): RedirectResponse
    {
        if (auth()->id() !== $task->user_id) {
            abort(403);
        }

        $task->update(['scheduled_at' => null]);
        $this->clearRemindersAndNotifications($task);

        return back();
    }

    public function destroy(Task $task): RedirectResponse
    {
        if (auth()->id() !== $task->user_id) {
            abort(403);
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
