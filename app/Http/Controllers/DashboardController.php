<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $workspaceIds = $user->workspaces()->pluck('workspaces.id');
        $now = Carbon::now();

        $baseQuery = fn () => Task::query()
            ->whereHas('board', fn ($q) => $q->whereIn('workspace_id', $workspaceIds));

        $totalTasks = $baseQuery()->where('is_completed', false)->count();
        $completedTasks = $baseQuery()->where('is_completed', true)->count();
        $overdueCount = $baseQuery()
            ->where('is_completed', false)
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '<', $now)
            ->count();
        $upcomingCount = $baseQuery()
            ->where('is_completed', false)
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '>=', $now)
            ->where('scheduled_at', '<=', $now->copy()->addDays(7))
            ->count();

        $upcomingTasks = $baseQuery()
            ->with(['tags', 'board.workspace'])
            ->where('is_completed', false)
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '>=', $now)
            ->orderBy('scheduled_at')
            ->limit(10)
            ->get();

        $overdueTasks = $baseQuery()
            ->with(['tags', 'board.workspace'])
            ->where('is_completed', false)
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '<', $now)
            ->orderBy('scheduled_at', 'desc')
            ->limit(5)
            ->get();

        $recentlyCompleted = $baseQuery()
            ->with(['tags', 'board.workspace'])
            ->where('is_completed', true)
            ->latest('updated_at')
            ->limit(5)
            ->get();

        $workspaces = $user->workspaces()->withPivot('role')->get();
        $workspaceBreakdowns = $workspaces->map(function ($workspace) {
            $tasks = $workspace->tasks();

            return [
                'id' => $workspace->id,
                'name' => $workspace->name,
                'is_personal' => $workspace->is_personal,
                'total_tasks' => (clone $tasks)->where('is_completed', false)->count(),
                'completed_tasks' => (clone $tasks)->where('is_completed', true)->count(),
            ];
        });

        return Inertia::render('dashboard', [
            'summary' => [
                'totalTasks' => $totalTasks,
                'completedTasks' => $completedTasks,
                'overdueTasks' => $overdueCount,
                'upcomingTasks' => $upcomingCount,
            ],
            'upcomingTasks' => $upcomingTasks,
            'overdueTasks' => $overdueTasks,
            'recentlyCompleted' => $recentlyCompleted,
            'workspaceBreakdowns' => $workspaceBreakdowns,
        ]);
    }
}
