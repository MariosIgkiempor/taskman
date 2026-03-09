import { router } from '@inertiajs/react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import TaskController from '@/actions/App/Http/Controllers/TaskController';
import type { Task } from '@/types';

interface TaskCardProps {
    task: Task;
    isDragOverlay?: boolean;
}

export function TaskCard({ task, isDragOverlay }: TaskCardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `task-${task.id}`,
        data: { task },
        disabled: isDragOverlay,
    });

    const style = transform
        ? { transform: CSS.Translate.toString(transform) }
        : undefined;

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
            ref={!isDragOverlay ? setNodeRef : undefined}
            style={style}
            className={`flex items-center gap-2 rounded-lg border bg-card p-2 text-sm shadow-sm ${
                isDragging ? 'opacity-50' : ''
            } ${isDragOverlay ? 'shadow-lg ring-2 ring-primary/20' : ''}`}
        >
            <button
                type="button"
                className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
                {...(isDragOverlay ? {} : { ...listeners, ...attributes })}
            >
                <GripVertical className="size-4" />
            </button>
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
