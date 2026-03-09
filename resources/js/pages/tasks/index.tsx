import { Head } from '@inertiajs/react';
import { useCallback, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { TaskSidebar } from '@/components/tasks/task-sidebar';
import { WeeklyCalendar } from '@/components/tasks/weekly-calendar';
import { TaskEditPopover } from '@/components/tasks/task-edit-popover';
import { index as tasksIndex } from '@/routes/tasks';
import type { BreadcrumbItem, Tag, Task } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Tasks',
        href: tasksIndex(),
    },
];

interface Props {
    unscheduledTasks: Task[];
    scheduledTasks: Task[];
    currentWeekStart: string;
    tags: Tag[];
}

export default function TasksIndex({ unscheduledTasks, scheduledTasks, currentWeekStart, tags }: Props) {
    const sidebarRef = useRef<HTMLDivElement>(null);
    const [localTags, setLocalTags] = useState<Tag[]>(tags);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [anchorPoint, setAnchorPoint] = useState<{ x: number; y: number } | null>(null);

    const handleTagCreated = useCallback((tag: Tag) => {
        setLocalTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
    }, []);

    const handleTaskClick = useCallback((task: Task, event: React.MouseEvent) => {
        setEditingTask(task);
        setAnchorPoint({ x: event.clientX, y: event.clientY });
    }, []);

    const handleCloseEdit = useCallback(() => {
        setEditingTask(null);
        setAnchorPoint(null);
    }, []);

    // Find the latest version of the editing task from props (it may have been updated by Inertia reload)
    const currentEditingTask = editingTask
        ? [...unscheduledTasks, ...scheduledTasks].find((t) => t.id === editingTask.id) ?? editingTask
        : null;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tasks" />
            <div className="grid h-[calc(100vh-5rem)] grid-cols-[320px_1fr] gap-0 p-0">
                <div className="border-r border-border/40 p-4">
                    <TaskSidebar
                        ref={sidebarRef}
                        tasks={unscheduledTasks}
                        tags={localTags}
                        onTagCreated={handleTagCreated}
                        onTaskClick={handleTaskClick}
                    />
                </div>
                <div className="overflow-hidden p-4">
                    <WeeklyCalendar
                        tasks={scheduledTasks}
                        weekStart={currentWeekStart}
                        sidebarRef={sidebarRef}
                        onTaskClick={handleTaskClick}
                    />
                </div>
            </div>
            <TaskEditPopover
                task={currentEditingTask}
                anchorPoint={anchorPoint}
                tags={localTags}
                onClose={handleCloseEdit}
                onTagCreated={handleTagCreated}
            />
        </AppLayout>
    );
}
