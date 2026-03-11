<?php

namespace App\Policies;

use App\Enums\WorkspaceRole;
use App\Models\Board;
use App\Models\User;
use App\Models\Workspace;

class BoardPolicy
{
    public function view(User $user, Board $board): bool
    {
        return $board->workspace->roleFor($user) !== null;
    }

    public function create(User $user, Workspace $workspace): bool
    {
        $role = $workspace->roleFor($user);

        return $role === WorkspaceRole::Owner || $role === WorkspaceRole::Admin;
    }

    public function update(User $user, Board $board): bool
    {
        $role = $board->workspace->roleFor($user);

        return $role === WorkspaceRole::Owner || $role === WorkspaceRole::Admin;
    }

    public function delete(User $user, Board $board): bool
    {
        $role = $board->workspace->roleFor($user);

        return $role === WorkspaceRole::Owner || $role === WorkspaceRole::Admin;
    }
}
