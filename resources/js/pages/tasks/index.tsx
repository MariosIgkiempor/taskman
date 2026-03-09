import { Head } from '@inertiajs/react';
import { useRef } from 'react';
import AppLayout from '@/layouts/app-layout';
import { TaskSidebar } from '@/components/tasks/task-sidebar';
import { WeeklyCalendar } from '@/components/tasks/weekly-calendar';
import { WeekNavigator } from '@/components/tasks/week-navigator';
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
            <div className="grid h-[calc(100vh-5rem)] grid-cols-[320px_1fr] gap-0 p-0">
                <div className="border-r border-border/40 p-4">
                    <TaskSidebar ref={sidebarRef} tasks={unscheduledTasks} />
                </div>
                <div className="flex flex-col gap-3 overflow-hidden p-4">
                    <WeekNavigator weekStart={currentWeekStart} />
                    <div className="min-h-0 flex-1">
                        <WeeklyCalendar tasks={scheduledTasks} weekStart={currentWeekStart} sidebarRef={sidebarRef} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
