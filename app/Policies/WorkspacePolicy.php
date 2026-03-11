<?php

namespace App\Policies;

use App\Enums\WorkspaceRole;
use App\Models\User;
use App\Models\Workspace;

class WorkspacePolicy
{
    public function view(User $user, Workspace $workspace): bool
    {
        return $workspace->roleFor($user) !== null;
    }

    public function update(User $user, Workspace $workspace): bool
    {
        $role = $workspace->roleFor($user);

        return $role === WorkspaceRole::Owner || $role === WorkspaceRole::Admin;
    }

    public function delete(User $user, Workspace $workspace): bool
    {
        if ($workspace->is_personal) {
            return false;
        }

        return $workspace->roleFor($user) === WorkspaceRole::Owner;
    }

    public function manageMembers(User $user, Workspace $workspace): bool
    {
        if ($workspace->is_personal) {
            return false;
        }

        $role = $workspace->roleFor($user);

        return $role === WorkspaceRole::Owner || $role === WorkspaceRole::Admin;
    }

    public function createInvite(User $user, Workspace $workspace): bool
    {
        if ($workspace->is_personal) {
            return false;
        }

        $role = $workspace->roleFor($user);

        return $role === WorkspaceRole::Owner || $role === WorkspaceRole::Admin;
    }
}
