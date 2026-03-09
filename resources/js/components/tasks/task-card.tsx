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
            className="flex cursor-grab items-center gap-2 rounded-lg border bg-card p-2 text-sm shadow-sm"
        >
            <GripVertical className="size-4 text-muted-foreground" />
            <Checkbox
                checked={task.is_completed}
                onCheckedChange={handleToggleComplete}
            />
            <span className={`flex-1 truncate ${task.is_completed ? 'text-muted-foreground line-through' : ''}`}>
                {task.title}
            </span>
            <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={handleDelete}
            >
                <Trash2 className="size-3.5" />
            </Button>
        </div>
    );
}
