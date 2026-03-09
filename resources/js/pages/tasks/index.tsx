import { Head } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { TaskSidebar } from '@/components/tasks/task-sidebar';
import { WeeklyCalendar } from '@/components/tasks/weekly-calendar';
import { TaskCard } from '@/components/tasks/task-card';
import TaskController from '@/actions/App/Http/Controllers/TaskController';
import { index as tasksIndex } from '@/routes/tasks';
import type { BreadcrumbItem, Task } from '@/types';

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
}

export default function TasksIndex({ unscheduledTasks, scheduledTasks, currentWeekStart }: Props) {
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        }),
    );

    const handleDragStart = (event: DragStartEvent) => {
        const task = event.active.data.current?.task as Task | undefined;
        if (task) {
            setActiveTask(task);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveTask(null);

        const { active, over } = event;
        if (!over) {
            return;
        }

        const task = active.data.current?.task as Task | undefined;
        if (!task) {
            return;
        }

        const overId = String(over.id);

        if (overId === 'unscheduled') {
            if (task.scheduled_at) {
                router.patch(TaskController.unschedule.url(task.id), {}, { preserveScroll: true });
            }
        } else if (overId.startsWith('slot-')) {
            const datetime = overId.split('|')[1];
            if (datetime) {
                router.patch(
                    TaskController.schedule.url(task.id),
                    { scheduled_at: datetime },
                    { preserveScroll: true },
                );
            }
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tasks" />
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="grid h-[calc(100vh-6rem)] grid-cols-3 gap-4 p-4">
                    <div className="col-span-1 overflow-hidden">
                        <TaskSidebar tasks={unscheduledTasks} />
                    </div>
                    <div className="col-span-2 overflow-hidden">
                        <WeeklyCalendar tasks={scheduledTasks} weekStart={currentWeekStart} />
                    </div>
                </div>
                <DragOverlay>
                    {activeTask ? <TaskCard task={activeTask} isDragOverlay /> : null}
                </DragOverlay>
            </DndContext>
        </AppLayout>
    );
}
