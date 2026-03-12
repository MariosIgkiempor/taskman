<?php

namespace App\Policies;

use App\Enums\WorkspaceRole;
use App\Models\Tag;
use App\Models\User;

class TagPolicy
{
    public function view(User $user, Tag $tag): bool
    {
        return $tag->workspace->roleFor($user) !== null;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Tag $tag): bool
    {
        return $tag->workspace->roleFor($user) !== null;
    }

    public function delete(User $user, Tag $tag): bool
    {
        $role = $tag->workspace->roleFor($user);

        return $role === WorkspaceRole::Owner || $role === WorkspaceRole::Admin;
    }
}
