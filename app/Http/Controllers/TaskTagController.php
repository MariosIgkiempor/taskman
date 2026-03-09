<?php

namespace App\Http\Controllers;

use App\Http\Requests\Task\SyncTaskTagsRequest;
use App\Models\Task;
use Illuminate\Http\JsonResponse;

class TaskTagController extends Controller
{
    public function sync(SyncTaskTagsRequest $request, Task $task): JsonResponse
    {
        $task->tags()->sync($request->validated('tag_ids'));

        return response()->json($task->tags);
    }
}
