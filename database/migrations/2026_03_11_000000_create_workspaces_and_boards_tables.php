<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Phase A: Create new tables
        Schema::create('workspaces', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255);
            $table->boolean('is_personal')->default(false);
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('workspace_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 20)->default('member');
            $table->timestamps();
            $table->unique(['workspace_id', 'user_id']);
        });

        Schema::create('boards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->string('name', 255);
            $table->string('color', 20)->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
            $table->index(['workspace_id', 'position']);
        });

        Schema::create('workspace_invites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->string('token', 64)->unique();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->datetime('expires_at')->nullable();
            $table->timestamps();
        });

        // Phase B: Add board_id to tasks
        Schema::table('tasks', function (Blueprint $table) {
            $table->unsignedBigInteger('board_id')->nullable()->after('user_id');
        });

        // Data migration: create personal workspaces and backfill board_id
        $users = DB::table('users')->get();

        foreach ($users as $user) {
            $workspaceId = DB::table('workspaces')->insertGetId([
                'name' => $user->name."'s Workspace",
                'is_personal' => true,
                'owner_id' => $user->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('workspace_user')->insert([
                'workspace_id' => $workspaceId,
                'user_id' => $user->id,
                'role' => 'owner',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $boardId = DB::table('boards')->insertGetId([
                'workspace_id' => $workspaceId,
                'name' => 'My Tasks',
                'position' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('tasks')
                ->where('user_id', $user->id)
                ->update(['board_id' => $boardId]);
        }

        Schema::table('tasks', function (Blueprint $table) {
            $table->unsignedBigInteger('board_id')->nullable(false)->change();
            $table->foreign('board_id')->references('id')->on('boards')->cascadeOnDelete();
            $table->dropIndex(['user_id', 'scheduled_at']);
            $table->index(['board_id', 'scheduled_at']);
        });

        // Phase C: Replace user_id with workspace_id on tags
        Schema::table('tags', function (Blueprint $table) {
            $table->unsignedBigInteger('workspace_id')->nullable()->after('id');
        });

        DB::statement('UPDATE tags SET workspace_id = (SELECT id FROM workspaces WHERE owner_id = tags.user_id AND is_personal = 1)');

        Schema::table('tags', function (Blueprint $table) {
            $table->unsignedBigInteger('workspace_id')->nullable(false)->change();
            $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
            $table->dropUnique(['user_id', 'name']);
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
            $table->unique(['workspace_id', 'name']);
        });
    }

    public function down(): void
    {
        // Restore user_id on tags
        Schema::table('tags', function (Blueprint $table) {
            $table->dropUnique(['workspace_id', 'name']);
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
        });

        DB::statement('UPDATE tags SET user_id = (SELECT owner_id FROM workspaces WHERE id = tags.workspace_id AND is_personal = 1)');

        Schema::table('tags', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
            $table->unique(['user_id', 'name']);
            $table->dropForeign(['workspace_id']);
            $table->dropColumn('workspace_id');
        });

        // Restore tasks table
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex(['board_id', 'scheduled_at']);
            $table->dropForeign(['board_id']);
            $table->dropColumn('board_id');
            $table->index(['user_id', 'scheduled_at']);
        });

        Schema::dropIfExists('workspace_invites');
        Schema::dropIfExists('boards');
        Schema::dropIfExists('workspace_user');
        Schema::dropIfExists('workspaces');
    }
};
