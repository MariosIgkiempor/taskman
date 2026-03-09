<?php

namespace App\Http\Controllers;

use App\Http\Requests\Task\ScheduleTaskRequest;
use App\Http\Requests\Task\StoreTaskRequest;
use App\Http\Requests\Task\UpdateTaskRequest;
use App\Models\Task;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class TaskController extends Controller
{
    public function index(): Response
    {
        $user = auth()->user();
        $weekStart = Carbon::now()->startOfWeek();

        return Inertia::render('tasks/index', [
            'unscheduledTasks' => $user->tasks()->with('tags')->unscheduled()->orderBy('position')->orderBy('created_at', 'desc')->get(),
            'scheduledTasks' => $user->tasks()->with('tags')->scheduled()->forWeek($weekStart)->orderBy('scheduled_at')->get(),
            'currentWeekStart' => $weekStart->toISOString(),
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

        return back();
    }

    public function schedule(ScheduleTaskRequest $request, Task $task): RedirectResponse
    {
        $task->update(['scheduled_at' => $request->validated('scheduled_at')]);

        return back();
    }

    public function unschedule(Task $task): RedirectResponse
    {
        if (auth()->id() !== $task->user_id) {
            abort(403);
        }

        $task->update(['scheduled_at' => null]);

        return back();
    }

    public function destroy(Task $task): RedirectResponse
    {
        if (auth()->id() !== $task->user_id) {
            abort(403);
        }

        $task->delete();

        return back();
    }
}
