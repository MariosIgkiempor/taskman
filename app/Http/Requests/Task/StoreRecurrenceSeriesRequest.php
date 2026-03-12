<?php

namespace App\Http\Requests\Task;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRecurrenceSeriesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'existing_task_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('tasks', 'id')->where('user_id', $this->user()->id)->whereNull('recurrence_series_id'),
            ],
            'board_id' => ['required', 'integer', Rule::exists('boards', 'id')],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'start_date' => ['required', 'date'],
            'time_of_day' => ['required', 'date_format:H:i'],
            'duration_minutes' => ['sometimes', 'integer', 'min:5', 'max:1440'],
            'location' => ['nullable', 'string', 'max:500'],
            'location_coordinates' => ['nullable', 'array'],
            'location_coordinates.lat' => ['required_with:location_coordinates', 'numeric', 'between:-90,90'],
            'location_coordinates.lng' => ['required_with:location_coordinates', 'numeric', 'between:-180,180'],
            'frequency' => ['required', Rule::in(['daily', 'weekly', 'monthly', 'yearly'])],
            'interval' => ['sometimes', 'integer', 'min:1', 'max:99'],
            'days_of_week' => ['nullable', 'array'],
            'days_of_week.*' => ['integer', 'between:1,7'],
            'month_day' => ['nullable', 'integer', 'between:1,31'],
            'month_week_ordinal' => ['nullable', 'integer', 'between:1,5'],
            'month_week_day' => ['nullable', 'integer', 'between:1,7'],
            'end_date' => ['nullable', 'date', 'after:start_date'],
            'end_count' => ['nullable', 'integer', 'min:1', 'max:999'],
            'tag_ids' => ['sometimes', 'array'],
            'tag_ids.*' => [
                'integer',
                Rule::exists('tags', 'id')->where('workspace_id', \App\Models\Board::find($this->input('board_id'))?->workspace_id),
            ],
            'reminders' => ['sometimes', 'array'],
            'reminders.*' => ['integer', 'min:1'],
        ];
    }
}
