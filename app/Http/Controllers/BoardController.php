<?php

namespace App\Http\Controllers;

use App\Http\Requests\Board\StoreBoardRequest;
use App\Http\Requests\Board\UpdateBoardRequest;
use App\Models\Board;
use App\Models\Workspace;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;

class BoardController extends Controller
{
    public function store(StoreBoardRequest $request, Workspace $workspace): RedirectResponse
    {
        $workspace->boards()->create($request->validated());

        return back();
    }

    public function update(UpdateBoardRequest $request, Board $board): RedirectResponse
    {
        $board->update($request->validated());

        return back();
    }

    public function destroy(Board $board): RedirectResponse
    {
        Gate::authorize('delete', $board);

        if ($board->workspace->boards()->count() <= 1) {
            abort(422, 'Cannot delete the last board in a workspace.');
        }

        $board->delete();

        return back();
    }
}
