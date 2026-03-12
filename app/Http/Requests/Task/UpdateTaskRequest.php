<?php

namespace App\Http\Requests\Task;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('task'));
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'is_completed' => ['sometimes', 'boolean'],
            'location' => ['sometimes', 'nullable', 'string', 'max:500'],
            'location_coordinates' => ['sometimes', 'nullable', 'array'],
            'location_coordinates.lat' => ['required_with:location_coordinates', 'numeric', 'between:-90,90'],
            'location_coordinates.lng' => ['required_with:location_coordinates', 'numeric', 'between:-180,180'],
            'recurrence_scope' => ['sometimes', 'nullable', Rule::in(['single', 'following', 'all'])],
        ];
    }
}
