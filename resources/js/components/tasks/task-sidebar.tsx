import { forwardRef } from 'react';
import { Inbox } from 'lucide-react';
import { TaskForm } from '@/components/tasks/task-form';
import { TaskCard } from '@/components/tasks/task-card';
import type { Task } from '@/types';

interface TaskSidebarProps {
    tasks: Task[];
}

export const TaskSidebar = forwardRef<HTMLDivElement, TaskSidebarProps>(function TaskSidebar({ tasks }, ref) {
    return (
        <div className="flex h-full flex-col gap-4">
            <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
                    <Inbox className="size-3.5 text-primary" />
                </div>
                <h2 className="text-sm font-bold tracking-tight">Backlog</h2>
                {tasks.length > 0 && (
                    <span className="ml-auto rounded-md bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                        {tasks.length}
                    </span>
                )}
            </div>
            <TaskForm />
            <div
                ref={ref}
                className="flex flex-1 flex-col gap-1 overflow-y-auto rounded-lg bg-muted/50 p-1.5 transition-colors"
            >
                {tasks.length === 0 && (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
                        <div className="rounded-xl bg-muted p-3">
                            <Inbox className="size-5 text-muted-foreground/40" />
                        </div>
                        <p className="text-xs font-medium text-muted-foreground/60">
                            No tasks yet
                        </p>
                    </div>
                )}
                {tasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                ))}
            </div>
        </div>
    );
});
