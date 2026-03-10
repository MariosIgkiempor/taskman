import { Head } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TaskEditPopover } from '@/components/tasks/task-edit-popover';
import { TaskSidebar } from '@/components/tasks/task-sidebar';
import { WeekNavigator } from '@/components/tasks/week-navigator';
import { WeeklyCalendar } from '@/components/tasks/weekly-calendar';
import AppLayout from '@/layouts/app-layout';
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

export default function TasksIndex({
    unscheduledTasks,
    scheduledTasks,
    currentWeekStart,
    tags,
}: Props) {
    const sidebarRef = useRef<HTMLDivElement>(null);
    const [localTags, setLocalTags] = useState<Tag[]>(tags);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [anchorPoint, setAnchorPoint] = useState<{
        x: number;
        y: number;
    } | null>(null);

    useEffect(() => {
        setLocalTags(tags);
    }, [tags]);

    useEffect(() => {
        handleCloseEdit();
    }, [currentWeekStart]);

    const handleTagCreated = useCallback((tag: Tag) => {
        setLocalTags((prev) =>
            [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)),
        );
    }, []);

    const handleTagUpdated = useCallback((updatedTag: Tag) => {
        setLocalTags((prev) =>
            prev.map((tag) => (tag.id === updatedTag.id ? updatedTag : tag)),
        );
    }, []);

    const handleTaskClick = useCallback(
        (task: Task, event: React.MouseEvent) => {
            setEditingTask(task);
            setAnchorPoint({ x: event.clientX, y: event.clientY });
        },
        [],
    );

    const handleCloseEdit = useCallback(() => {
        setEditingTask(null);
        setAnchorPoint(null);
    }, []);

    // Find the latest version of the editing task from props (it may have been updated by Inertia reload)
    const currentEditingTask = editingTask
        ? ([...unscheduledTasks, ...scheduledTasks].find(
              (t) => t.id === editingTask.id,
          ) ?? editingTask)
        : null;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tasks" />
            <div className="grid h-[calc(100vh-5rem)] grid-cols-[320px_1fr] gap-0 p-0">
                <div className="border-r border-border/40 p-4">
                    <TaskSidebar
                        ref={sidebarRef}
                        tasks={unscheduledTasks}
                        scheduledTasks={scheduledTasks}
                        tags={localTags}
                        onTagCreated={handleTagCreated}
                        onTaskClick={handleTaskClick}
                    />
                </div>
                <div className="flex flex-col gap-3 overflow-hidden p-4">
                    <WeekNavigator weekStart={currentWeekStart} />
                    <div className="min-h-0 flex-1">
                        <WeeklyCalendar
                            tasks={scheduledTasks}
                            weekStart={currentWeekStart}
                            sidebarRef={sidebarRef}
                            onTaskClick={handleTaskClick}
                        />
                    </div>
                </div>
            </div>
            <TaskEditPopover
                task={currentEditingTask}
                anchorPoint={anchorPoint}
                tags={localTags}
                onClose={handleCloseEdit}
                onTagCreated={handleTagCreated}
                onTagUpdated={handleTagUpdated}
            />
        </AppLayout>
    );
}
