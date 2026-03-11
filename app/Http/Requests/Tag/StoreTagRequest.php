<?php

namespace App\Http\Requests\Tag;

use App\Enums\TagColor;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

class StoreTagRequest extends FormRequest
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
            'name' => [
                'required',
                'string',
                'max:50',
                Rule::unique('tags')->where('workspace_id', $this->user()->personalWorkspace?->id),
            ],
            'color' => ['required', new Enum(TagColor::class)],
        ];
    }
}
