<?php

namespace App\Http\Requests\Task;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRecurrenceSeriesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->id === $this->route('recurrenceSeries')->user_id;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'time_of_day' => ['sometimes', 'date_format:H:i'],
            'duration_minutes' => ['sometimes', 'integer', 'min:5', 'max:1440'],
            'location' => ['sometimes', 'nullable', 'string', 'max:500'],
            'location_coordinates' => ['sometimes', 'nullable', 'array'],
            'location_coordinates.lat' => ['required_with:location_coordinates', 'numeric', 'between:-90,90'],
            'location_coordinates.lng' => ['required_with:location_coordinates', 'numeric', 'between:-180,180'],
            'frequency' => ['sometimes', Rule::in(['daily', 'weekly', 'monthly', 'yearly'])],
            'interval' => ['sometimes', 'integer', 'min:1', 'max:99'],
            'days_of_week' => ['sometimes', 'nullable', 'array'],
            'days_of_week.*' => ['integer', 'between:1,7'],
            'month_day' => ['sometimes', 'nullable', 'integer', 'between:1,31'],
            'month_week_ordinal' => ['sometimes', 'nullable', 'integer', 'between:1,5'],
            'month_week_day' => ['sometimes', 'nullable', 'integer', 'between:1,7'],
            'end_date' => ['sometimes', 'nullable', 'date'],
            'end_count' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:999'],
            'tag_ids' => ['sometimes', 'array'],
            'tag_ids.*' => [
                'integer',
                Rule::exists('tags', 'id')->where('user_id', $this->user()->id),
            ],
        ];
    }
}
