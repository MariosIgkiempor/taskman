import { router } from '@inertiajs/react';
import { GripVertical, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import TaskController from '@/actions/App/Http/Controllers/TaskController';
import type { Task } from '@/types';

interface TaskCardProps {
    task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
    const handleToggleComplete = () => {
        router.patch(
            TaskController.update.url(task.id),
            { is_completed: !task.is_completed },
            { preserveScroll: true },
        );
    };

    const handleDelete = () => {
        router.delete(TaskController.destroy.url(task.id), {
            preserveScroll: true,
        });
    };

    return (
        <div
            data-task-id={task.id}
            data-task-title={task.title}
            className={`group flex cursor-grab items-center gap-2.5 rounded-lg bg-card p-2.5 text-sm transition-colors duration-100 hover:bg-accent active:cursor-grabbing ${
                task.is_completed ? 'opacity-50' : ''
            }`}
        >
            <GripVertical className="size-3.5 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground/60" />
            <Checkbox
                checked={task.is_completed}
                onCheckedChange={handleToggleComplete}
            />
            <span className={`flex-1 truncate text-[0.8125rem] font-medium leading-snug ${task.is_completed ? 'text-muted-foreground line-through' : ''}`}>
                {task.title}
            </span>
            <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 hover:!text-destructive"
                onClick={handleDelete}
            >
                <Trash2 className="size-3" />
            </Button>
        </div>
    );
}
