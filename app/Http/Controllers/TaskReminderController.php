<?php

namespace App\Http\Controllers;

use App\Http\Requests\Task\SyncTaskRemindersRequest;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class TaskReminderController extends Controller
{
    public function rearm(Task $task): JsonResponse
    {
        Gate::authorize('update', $task);

        $task->reminders()->whereNotNull('notified_at')->update(['notified_at' => null]);

        return response()->json([
            'reminders' => $task->reminders()->pluck('minutes_before'),
        ]);
    }

    public function sync(SyncTaskRemindersRequest $request, Task $task): JsonResponse
    {
        $existing = $task->reminders()
            ->whereNotNull('notified_at')
            ->pluck('notified_at', 'minutes_before');

        $task->reminders()->delete();

        $reminders = collect($request->validated('reminders'))->map(fn (int $minutes) => [
            'minutes_before' => $minutes,
            'notified_at' => $existing->get($minutes),
        ]);

        $task->reminders()->createMany($reminders->all());

        return response()->json([
            'reminders' => $task->reminders()->pluck('minutes_before'),
        ]);
    }
}
