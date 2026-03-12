<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Enums\WorkspaceRole;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
        ])->validate();

        $user = User::create([
            'name' => $input['name'],
            'email' => $input['email'],
            'password' => $input['password'],
        ]);

        $workspace = $user->ownedWorkspaces()->create([
            'name' => $user->name."'s Workspace",
            'is_personal' => true,
        ]);

        $workspace->members()->attach($user, ['role' => WorkspaceRole::Owner->value]);

        $workspace->boards()->create([
            'name' => 'My Tasks',
            'position' => 0,
        ]);

        return $user;
    }
}
