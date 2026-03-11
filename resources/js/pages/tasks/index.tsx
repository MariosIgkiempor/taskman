import { Head, router } from '@inertiajs/react';
import { useCallback, useRef, useState } from 'react';
import TaskReminderController from '@/actions/App/Http/Controllers/TaskReminderController';
import { TaskEditPopover } from '@/components/tasks/task-edit-popover';
import { TaskSidebar } from '@/components/tasks/task-sidebar';
import { WeekNavigator } from '@/components/tasks/week-navigator';
import { WeeklyCalendar } from '@/components/tasks/weekly-calendar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { requestJson } from '@/lib/request-json';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Tag, Task } from '@/types';
import { index as tasksIndex } from '@/routes/tasks';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Tasks',
        href: tasksIndex(),
    },
];

interface Props {
    unscheduledTasks: Task[];
    scheduledTasks: Task[];
    completedTasks: Task[];
    currentWeekStart: string;
    tags: Tag[];
}

export default function TasksIndex({
    unscheduledTasks,
    scheduledTasks,
    completedTasks,
    currentWeekStart,
    tags,
}: Props) {
    const sidebarRef = useRef<HTMLDivElement>(null);
    const [localTags, setLocalTags] = useState<Tag[]>(tags);
    const [prevTags, setPrevTags] = useState<Tag[]>(tags);
    const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(
        new Set(),
    );
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [anchorPoint, setAnchorPoint] = useState<{
        x: number;
        y: number;
    } | null>(null);
    const [rearmTask, setRearmTask] = useState<Task | null>(null);
    const [prevWeekStart, setPrevWeekStart] = useState(currentWeekStart);

    if (currentWeekStart !== prevWeekStart) {
        setPrevWeekStart(currentWeekStart);
        setEditingTask(null);
        setAnchorPoint(null);
    }

    if (tags !== prevTags) {
        setPrevTags(tags);
        setLocalTags(tags);
        const validIds = new Set(tags.map((t) => t.id));
        setSelectedTagIds((prev) => {
            const next = new Set([...prev].filter((id) => validIds.has(id)));
            return next.size === prev.size ? prev : next;
        });
    }

    const handleTagCreated = useCallback((tag: Tag) => {
        setLocalTags((prev) =>
            [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)),
        );
    }, []);

    const handleTagFilterToggle = useCallback((tagId: number) => {
        setSelectedTagIds((prev) => {
            const next = new Set(prev);
            if (next.has(tagId)) {
                next.delete(tagId);
            } else {
                next.add(tagId);
            }
            return next;
        });
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

    const handleScheduledWithNotifiedReminders = useCallback((task: Task) => {
        setRearmTask(task);
    }, []);

    const handleRearm = useCallback(() => {
        if (!rearmTask) return;
        void requestJson('patch', TaskReminderController.rearm.url(rearmTask.id)).then(() => {
            router.reload();
        });
        setRearmTask(null);
    }, [rearmTask]);

    // Find the latest version of the editing task from props (it may have been updated by Inertia reload)
    const currentEditingTask = editingTask
        ? ([...unscheduledTasks, ...scheduledTasks, ...completedTasks].find(
              (t) => t.id === editingTask.id,
          ) ?? editingTask)
        : null;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tasks" />
            <div className="grid min-h-0 flex-1 grid-cols-[320px_1fr] gap-0 p-0">
                <div className="flex min-h-0 flex-col border-r border-border/40 p-4">
                    <TaskSidebar
                        ref={sidebarRef}
                        tasks={unscheduledTasks}
                        scheduledTasks={scheduledTasks}
                        completedTasks={completedTasks}
                        tags={localTags}
                        selectedTagIds={selectedTagIds}
                        onTagFilterToggle={handleTagFilterToggle}
                        onTagCreated={handleTagCreated}
                        onTaskClick={handleTaskClick}
                    />
                </div>
                <div className="flex min-h-0 flex-col gap-3 overflow-hidden p-4">
                    <WeekNavigator weekStart={currentWeekStart} />
                    <div className="min-h-0 flex-1">
                        <WeeklyCalendar
                            tasks={scheduledTasks}
                            weekStart={currentWeekStart}
                            sidebarRef={sidebarRef}
                            selectedTagIds={selectedTagIds}
                            onTaskClick={handleTaskClick}
                            onScheduledWithNotifiedReminders={handleScheduledWithNotifiedReminders}
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
                onScheduledWithNotifiedReminders={handleScheduledWithNotifiedReminders}
            />
            <Dialog open={rearmTask !== null} onOpenChange={(open) => { if (!open) setRearmTask(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Re-arm reminders?</DialogTitle>
                        <DialogDescription>
                            Reminders for this task have already been sent. Would you like to re-arm them for the new scheduled time?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRearmTask(null)}>
                            Skip
                        </Button>
                        <Button onClick={handleRearm}>
                            Re-arm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
