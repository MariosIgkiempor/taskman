import { Head } from '@inertiajs/react';
import { useRef } from 'react';
import AppLayout from '@/layouts/app-layout';
import { TaskSidebar } from '@/components/tasks/task-sidebar';
import { WeeklyCalendar } from '@/components/tasks/weekly-calendar';
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
    const sidebarRef = useRef<HTMLDivElement>(null);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tasks" />
            <div className="grid h-[calc(100vh-6rem)] grid-cols-3 gap-4 p-4">
                <div className="col-span-1 overflow-hidden">
                    <TaskSidebar ref={sidebarRef} tasks={unscheduledTasks} />
                </div>
                <div className="col-span-2 overflow-hidden">
                    <WeeklyCalendar tasks={scheduledTasks} weekStart={currentWeekStart} sidebarRef={sidebarRef} />
                </div>
            </div>
        </AppLayout>
    );
}
