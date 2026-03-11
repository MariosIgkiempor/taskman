<?php

namespace App\Http\Controllers;

use App\Enums\WorkspaceRole;
use App\Http\Requests\Workspace\StoreWorkspaceRequest;
use App\Http\Requests\Workspace\UpdateWorkspaceRequest;
use App\Models\Workspace;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class WorkspaceController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('workspaces/index', [
            'workspaces' => $request->user()->workspaces()->with('boards')->get(),
        ]);
    }

    public function store(StoreWorkspaceRequest $request): RedirectResponse
    {
        $workspace = Workspace::create([
            'name' => $request->validated('name'),
            'is_personal' => false,
            'owner_id' => $request->user()->id,
        ]);

        $workspace->members()->attach($request->user()->id, ['role' => WorkspaceRole::Owner->value]);
        $workspace->boards()->create(['name' => 'General', 'position' => 0]);

        return redirect()->route('tasks.index', $workspace);
    }

    public function update(UpdateWorkspaceRequest $request, Workspace $workspace): RedirectResponse
    {
        $workspace->update($request->validated());

        return back();
    }

    public function destroy(Workspace $workspace): RedirectResponse
    {
        Gate::authorize('delete', $workspace);

        $workspace->delete();

        return redirect()->route('tasks.index', auth()->user()->personalWorkspace);
    }
}
