import { useDroppable } from '@dnd-kit/core';
import { TaskForm } from '@/components/tasks/task-form';
import { TaskCard } from '@/components/tasks/task-card';
import type { Task } from '@/types';

interface TaskSidebarProps {
    tasks: Task[];
}

export function TaskSidebar({ tasks }: TaskSidebarProps) {
    const { setNodeRef, isOver } = useDroppable({ id: 'unscheduled' });

    return (
        <div className="flex h-full flex-col gap-4">
            <h2 className="text-lg font-semibold">Tasks</h2>
            <TaskForm />
            <div
                ref={setNodeRef}
                className={`flex flex-1 flex-col gap-2 overflow-y-auto rounded-lg border border-dashed p-2 transition-colors ${
                    isOver ? 'border-primary bg-primary/5' : 'border-transparent'
                }`}
            >
                {tasks.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                        No unscheduled tasks
                    </p>
                )}
                {tasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                ))}
            </div>
        </div>
    );
}
