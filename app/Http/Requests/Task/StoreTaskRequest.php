<?php

namespace App\Http\Requests\Task;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('view', $this->route('workspace'));
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'location' => ['nullable', 'string', 'max:500'],
            'location_coordinates' => ['nullable', 'array'],
            'location_coordinates.lat' => ['required_with:location_coordinates', 'numeric', 'between:-90,90'],
            'location_coordinates.lng' => ['required_with:location_coordinates', 'numeric', 'between:-180,180'],
            'board_id' => [
                'required',
                'integer',
                Rule::exists('boards', 'id')->where('workspace_id', $this->route('workspace')->id),
            ],
            'tag_ids' => ['sometimes', 'array'],
            'tag_ids.*' => [
                'integer',
                Rule::exists('tags', 'id')->where('workspace_id', $this->route('workspace')->id),
            ],
        ];
    }
}
