<?php

namespace App\Http\Requests\Tag;

use App\Enums\TagColor;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class UpdateTagRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->route('tag')->user_id === $this->user()->id;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'color' => ['required', new Enum(TagColor::class)],
        ];
    }
}
