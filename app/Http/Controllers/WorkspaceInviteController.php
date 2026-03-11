<?php

namespace App\Http\Controllers;

use App\Enums\WorkspaceRole;
use App\Http\Requests\Workspace\StoreInviteRequest;
use App\Models\Workspace;
use App\Models\WorkspaceInvite;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;

class WorkspaceInviteController extends Controller
{
    public function store(StoreInviteRequest $request, Workspace $workspace): RedirectResponse
    {
        $workspace->invites()->create([
            'created_by' => $request->user()->id,
            'expires_at' => $request->validated('expires_at'),
        ]);

        return back();
    }

    public function accept(string $token): RedirectResponse
    {
        $invite = WorkspaceInvite::where('token', $token)->firstOrFail();

        if ($invite->expires_at && $invite->expires_at->isPast()) {
            abort(410, 'This invite has expired.');
        }

        if (! auth()->check()) {
            return redirect()->guest(route('login'));
        }

        $user = auth()->user();
        $workspace = $invite->workspace;

        if (! $workspace->members()->where('user_id', $user->id)->exists()) {
            $workspace->members()->attach($user->id, ['role' => WorkspaceRole::Member->value]);
        }

        return redirect()->route('tasks.index', $workspace);
    }

    public function destroy(WorkspaceInvite $workspaceInvite): RedirectResponse
    {
        Gate::authorize('createInvite', $workspaceInvite->workspace);

        $workspaceInvite->delete();

        return back();
    }
}
