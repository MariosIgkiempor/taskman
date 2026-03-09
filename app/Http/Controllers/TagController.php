<?php

namespace App\Http\Controllers;

use App\Http\Requests\Tag\StoreTagRequest;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;

class TagController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(auth()->user()->tags()->orderBy('name')->get());
    }

    public function store(StoreTagRequest $request): JsonResponse
    {
        $tag = $request->user()->tags()->create($request->validated());

        return response()->json($tag, 201);
    }

    public function destroy(Tag $tag): JsonResponse
    {
        if (auth()->id() !== $tag->user_id) {
            abort(403);
        }

        $tag->delete();

        return response()->json(null, 204);
    }
}
