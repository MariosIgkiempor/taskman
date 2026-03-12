<?php

namespace App\Http\Controllers;

use App\Enums\WorkspaceRole;
use App\Http\Requests\Workspace\StoreWorkspaceRequest;
use App\Http\Requests\Workspace\UpdateWorkspaceRequest;
use App\Models\User;
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

    public function settings(Request $request, Workspace $workspace): Response
    {
        Gate::authorize('view', $workspace);

        return Inertia::render('workspaces/settings', [
            'workspace' => $workspace,
            'role' => $workspace->roleFor($request->user())->value,
        ]);
    }

    public function members(Request $request, Workspace $workspace): Response
    {
        Gate::authorize('view', $workspace);

        return Inertia::render('workspaces/members', [
            'workspace' => $workspace,
            'members' => $workspace->members()
                ->select('users.id', 'users.name', 'users.email')
                ->get()
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->pivot->role,
                ]),
            'invites' => $workspace->invites()->latest()->get(),
            'role' => $workspace->roleFor($request->user())->value,
        ]);
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
