<?php

namespace App\Http\Controllers;

use App\Http\Requests\Task\StoreRecurrenceSeriesRequest;
use App\Http\Requests\Task\UpdateRecurrenceSeriesRequest;
use App\Models\RecurrenceSeries;
use App\Services\RecurrenceService;
use Illuminate\Http\RedirectResponse;

class RecurrenceSeriesController extends Controller
{
    public function store(StoreRecurrenceSeriesRequest $request, RecurrenceService $service): RedirectResponse
    {
        $validated = $request->validated();
        $tagIds = $validated['tag_ids'] ?? [];
        $reminders = $validated['reminders'] ?? [];
        $existingTaskId = $validated['existing_task_id'] ?? null;
        unset($validated['tag_ids'], $validated['reminders'], $validated['existing_task_id']);

        $service->createSeries($request->user(), $validated, $tagIds, $reminders, $existingTaskId);

        return back();
    }

    public function update(UpdateRecurrenceSeriesRequest $request, RecurrenceSeries $recurrenceSeries, RecurrenceService $service): RedirectResponse
    {
        $validated = $request->validated();
        $tagIds = $validated['tag_ids'] ?? [];
        unset($validated['tag_ids'], $validated['reminders']);

        $service->editAllInstances($recurrenceSeries, $validated, $tagIds);

        return back();
    }
}
