import { forwardRef } from 'react';
import { TaskForm } from '@/components/tasks/task-form';
import { TaskCard } from '@/components/tasks/task-card';
import type { Task } from '@/types';

interface TaskSidebarProps {
    tasks: Task[];
}

export const TaskSidebar = forwardRef<HTMLDivElement, TaskSidebarProps>(function TaskSidebar({ tasks }, ref) {
    return (
        <div className="flex h-full flex-col gap-4">
            <h2 className="text-lg font-semibold">Tasks</h2>
            <TaskForm />
            <div
                ref={ref}
                className="flex flex-1 flex-col gap-2 overflow-y-auto rounded-lg border border-dashed border-transparent p-2"
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
});
