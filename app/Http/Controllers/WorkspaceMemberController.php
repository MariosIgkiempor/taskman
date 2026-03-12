<?php

namespace App\Http\Controllers;

use App\Http\Requests\Workspace\UpdateMemberRequest;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;

class WorkspaceMemberController extends Controller
{
    public function index(Workspace $workspace): JsonResponse
    {
        Gate::authorize('view', $workspace);

        return response()->json(
            $workspace->members()->select('users.id', 'users.name', 'users.email')->get()
        );
    }

    public function update(UpdateMemberRequest $request, Workspace $workspace, User $member): RedirectResponse
    {
        if ($workspace->owner_id === $member->id) {
            abort(403, 'Cannot change the workspace owner\'s role.');
        }

        $workspace->members()->updateExistingPivot($member->id, [
            'role' => $request->validated('role'),
        ]);

        return back();
    }

    public function destroy(Workspace $workspace, User $member): RedirectResponse
    {
        if ($workspace->is_personal) {
            abort(403, 'Cannot remove members from a personal workspace.');
        }

        if ($workspace->owner_id === $member->id) {
            abort(403, 'Cannot remove the workspace owner.');
        }

        $isSelfRemoval = auth()->id() === $member->id;

        if (! $isSelfRemoval) {
            Gate::authorize('manageMembers', $workspace);
        }

        $workspace->members()->detach($member->id);

        if ($isSelfRemoval) {
            return redirect()->route('tasks.index', auth()->user()->personalWorkspace);
        }

        return back();
    }
}
