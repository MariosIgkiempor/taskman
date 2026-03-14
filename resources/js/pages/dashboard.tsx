import { Head, Link } from "@inertiajs/react";
import { AlertCircle, CalendarDays, CheckCircle2, Clock, ListTodo } from "lucide-react";
import { TagBadge } from "@/components/tags/tag-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppLayout from "@/layouts/app-layout";
import { dashboard } from "@/routes";
import { index as tasksIndex } from "@/routes/tasks";
import type { BreadcrumbItem, DashboardTask, WorkspaceBreakdown } from "@/types";

interface Summary {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  upcomingTasks: number;
}

interface Props {
  summary: Summary;
  upcomingTasks: DashboardTask[];
  overdueTasks: DashboardTask[];
  recentlyCompleted: DashboardTask[];
  workspaceBreakdowns: WorkspaceBreakdown[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: "Dashboard", href: dashboard() }];

function formatScheduledAt(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (isToday) {
    return `Today at ${time}`;
  }
  if (isTomorrow) {
    return `Tomorrow at ${time}`;
  }
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} at ${time}`;
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: typeof ListTodo;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-card p-5">
      <div className="flex items-center gap-3">
        <div className={`flex size-9 items-center justify-center rounded-lg ${color}/10`}>
          <Icon className={`size-4 ${color}`} />
        </div>
        <div>
          <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
            {label}
          </p>
          <p className="font-bold text-2xl tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  );
}

function taskDeepLink(task: DashboardTask): string {
  const base = tasksIndex.url(task.board.workspace);
  const params = new URLSearchParams();
  params.set("task", String(task.id));
  if (task.scheduled_at) {
    const date = new Date(task.scheduled_at);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diff);
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, "0");
    const d = String(monday.getDate()).padStart(2, "0");
    params.set("week", `${y}-${m}-${d}`);
  }
  return `${base}?${params.toString()}`;
}

function TaskRow({
  task,
  variant = "default",
}: {
  task: DashboardTask;
  variant?: "default" | "overdue" | "completed";
}) {
  return (
    <Link
      href={taskDeepLink(task)}
      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0 flex-1">
        <p
          className={`truncate font-medium text-sm ${variant === "completed" ? "text-muted-foreground line-through" : ""}`}
        >
          {task.title}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          {task.scheduled_at && (
            <span
              className={`flex items-center gap-1 text-xs ${variant === "overdue" ? "text-destructive" : "text-muted-foreground"}`}
            >
              <Clock className="size-3" />
              {formatScheduledAt(task.scheduled_at)}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {task.tags.slice(0, 2).map((tag) => (
          <TagBadge key={tag.id} tag={tag} size="sm" />
        ))}
        <Badge variant="outline" className="text-[0.625rem]">
          {task.board.workspace.is_personal
            ? task.board.name
            : `${task.board.workspace.name} / ${task.board.name}`}
        </Badge>
      </div>
    </Link>
  );
}

export default function Dashboard({
  summary,
  upcomingTasks,
  overdueTasks,
  recentlyCompleted,
  workspaceBreakdowns,
}: Props) {
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Dashboard" />
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">Welcome back</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Here's an overview of your tasks across all workspaces.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            label="Open Tasks"
            value={summary.totalTasks}
            icon={ListTodo}
            color="text-primary bg-primary"
          />
          <StatCard
            label="Completed"
            value={summary.completedTasks}
            icon={CheckCircle2}
            color="text-chart-5 bg-chart-5"
          />
          <StatCard
            label="Overdue"
            value={summary.overdueTasks}
            icon={AlertCircle}
            color="text-destructive bg-destructive"
          />
          <StatCard
            label="Upcoming"
            value={summary.upcomingTasks}
            icon={CalendarDays}
            color="text-chart-2 bg-chart-2"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-6">
            {overdueTasks.length > 0 && (
              <Card className="border-destructive/30">
                <CardHeader className="pb-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertCircle className="size-4 text-destructive" />
                    Overdue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="-mx-3 flex flex-col">
                    {overdueTasks.map((task) => (
                      <TaskRow key={task.id} task={task} variant="overdue" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="size-4 text-chart-2" />
                  Upcoming
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingTasks.length > 0 ? (
                  <div className="-mx-3 flex flex-col">
                    {upcomingTasks.map((task) => (
                      <TaskRow key={task.id} task={task} />
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-muted-foreground text-sm">
                    No upcoming tasks scheduled.
                  </p>
                )}
              </CardContent>
            </Card>

            {recentlyCompleted.length > 0 && (
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle2 className="size-4 text-chart-5" />
                    Recently Completed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="-mx-3 flex flex-col">
                    {recentlyCompleted.map((task) => (
                      <TaskRow key={task.id} task={task} variant="completed" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-base">Workspaces</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  {workspaceBreakdowns.map((ws) => {
                    const total = ws.total_tasks + ws.completed_tasks;
                    const pct = total > 0 ? Math.round((ws.completed_tasks / total) * 100) : 0;
                    return (
                      <Link
                        key={ws.id}
                        href={tasksIndex.url(ws)}
                        className="group rounded-lg p-2 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate font-medium text-sm">{ws.name}</span>
                          <span className="text-muted-foreground text-xs">
                            {ws.completed_tasks}/{total}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-chart-5 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
