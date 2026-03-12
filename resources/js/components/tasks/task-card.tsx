import { router } from "@inertiajs/react";
import { GripVertical, Trash2 } from "lucide-react";
import TaskController from "@/actions/App/Http/Controllers/TaskController";
import { TagBadge } from "@/components/tags/tag-badge";
import { Button } from "@/components/ui/button";
import { TaskCheckbox } from "@/components/ui/task-checkbox";
import type { Task } from "@/types";

interface TaskCardProps {
  task: Task;
  dimmed?: boolean;
  onTaskClick: (task: Task, event: React.MouseEvent) => void;
}

export function TaskCard({ task, dimmed, onTaskClick }: TaskCardProps) {
  const handleToggleComplete = () => {
    router.patch(
      TaskController.update.url(task.id),
      { is_completed: !task.is_completed },
      { preserveScroll: true },
    );
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.delete(TaskController.destroy.url(task.id), {
      preserveScroll: true,
    });
  };

  return (
    <div
      data-task-id={task.id}
      data-task-title={task.title}
      className={`group flex cursor-grab items-center gap-2.5 rounded-lg bg-card p-2.5 text-sm transition-all duration-100 hover:bg-accent active:cursor-grabbing ${
        task.is_completed ? "opacity-50" : dimmed ? "opacity-40" : ""
      }`}
      onClick={(e) => onTaskClick(task, e)}
    >
      <GripVertical className="size-3.5 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground/60" />
      <TaskCheckbox checked={task.is_completed} onCheckedChange={handleToggleComplete} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span
          className={`truncate font-medium text-[0.8125rem] leading-snug ${task.is_completed ? "text-muted-foreground line-through" : ""}`}
        >
          {task.title}
        </span>
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} size="sm" />
            ))}
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="hover:!text-destructive size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={handleDelete}
      >
        <Trash2 className="size-3" />
      </Button>
    </div>
  );
}
