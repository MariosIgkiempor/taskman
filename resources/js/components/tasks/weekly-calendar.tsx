import { useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import { router } from '@inertiajs/react';
import TaskController from '@/actions/App/Http/Controllers/TaskController';
import type { Task } from '@/types';
import type { EventContentArg, EventDropArg, EventResizeDoneArg } from '@fullcalendar/core';

interface WeeklyCalendarProps {
    tasks: Task[];
    weekStart: string;
    sidebarRef: React.RefObject<HTMLDivElement | null>;
}

export function WeeklyCalendar({ tasks, weekStart, sidebarRef }: WeeklyCalendarProps) {
    const calendarRef = useRef<FullCalendar>(null);
    const draggableRef = useRef<Draggable | null>(null);

    useEffect(() => {
        if (!sidebarRef.current) {
            return;
        }

        draggableRef.current = new Draggable(sidebarRef.current, {
            itemSelector: '[data-task-id]',
            eventData(eventEl) {
                const taskId = eventEl.getAttribute('data-task-id');
                const taskTitle = eventEl.getAttribute('data-task-title');
                return {
                    id: `task-${taskId}`,
                    title: taskTitle ?? '',
                    extendedProps: { taskId: Number(taskId) },
                    duration: '01:00',
                };
            },
        });

        return () => {
            draggableRef.current?.destroy();
        };
    }, [sidebarRef]);

    const events = tasks.filter((task) => task.scheduled_at).map((task) => ({
        id: `task-${task.id}`,
        title: task.title,
        start: task.scheduled_at!,
        end: new Date(new Date(task.scheduled_at!).getTime() + task.duration_minutes * 60 * 1000).toISOString(),
        extendedProps: { taskId: task.id, isCompleted: task.is_completed },
        classNames: task.is_completed ? ['fc-event-completed'] : [],
    }));

    const handleEventDrop = (info: EventDropArg) => {
        const taskId = info.event.extendedProps.taskId;
        const newStart = info.event.start;
        if (taskId && newStart) {
            router.patch(
                TaskController.schedule.url(taskId),
                { scheduled_at: newStart.toISOString() },
                { preserveScroll: true },
            );
        }
    };

    const handleEventReceive = (info: { event: { extendedProps: Record<string, unknown>; start: Date | null; remove: () => void } }) => {
        const taskId = info.event.extendedProps.taskId as number;
        const newStart = info.event.start;
        if (taskId && newStart) {
            info.event.remove();
            router.patch(
                TaskController.schedule.url(taskId),
                { scheduled_at: newStart.toISOString() },
                { preserveScroll: true },
            );
        }
    };

    const handleEventResize = (info: EventResizeDoneArg) => {
        const taskId = info.event.extendedProps.taskId as number;
        const start = info.event.start;
        const end = info.event.end;
        if (taskId && start && end) {
            const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
            router.patch(
                TaskController.schedule.url(taskId),
                { scheduled_at: start.toISOString(), duration_minutes: durationMinutes },
                { preserveScroll: true },
            );
        }
    };

    const formatDuration = (minutes: number): string => {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hrs === 0) return `${mins}min`;
        if (mins === 0) return `${hrs}hr`;
        return `${hrs}hr ${mins}min`;
    };

    const renderEventContent = (info: EventContentArg) => {
        const start = info.event.start;
        const end = info.event.end;
        const durationMinutes = start && end ? Math.round((end.getTime() - start.getTime()) / 60000) : 60;
        const timeStr = start
            ? start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
            : '';

        const isCompact = durationMinutes <= 20;

        if (isCompact) {
            return (
                <div className="fc-event-main-frame fc-event-compact">
                    <span className="fc-event-time">{timeStr} · {formatDuration(durationMinutes)}</span>
                    <span className="fc-event-title">&nbsp;– {info.event.title}</span>
                </div>
            );
        }

        return (
            <div className="fc-event-main-frame">
                <div className="fc-event-time">
                    {timeStr} · {formatDuration(durationMinutes)}
                </div>
                <div className="fc-event-title-container">
                    <div className="fc-event-title fc-sticky">{info.event.title}</div>
                </div>
            </div>
        );
    };

    const handleEventDragStop = (info: { event: { extendedProps: Record<string, unknown> }; jsEvent: MouseEvent }) => {
        if (!sidebarRef.current) {
            return;
        }

        const sidebarRect = sidebarRef.current.getBoundingClientRect();
        const { clientX, clientY } = info.jsEvent;

        if (
            clientX >= sidebarRect.left &&
            clientX <= sidebarRect.right &&
            clientY >= sidebarRect.top &&
            clientY <= sidebarRect.bottom
        ) {
            const taskId = info.event.extendedProps.taskId as number;
            router.patch(TaskController.unschedule.url(taskId), {}, { preserveScroll: true });
        }
    };

    return (
        <div className="h-full overflow-hidden rounded-lg bg-card [&_.fc]:h-full">
            <FullCalendar
                ref={calendarRef}
                plugins={[timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                initialDate={weekStart}
                headerToolbar={false}
                slotMinTime="06:00:00"
                slotMaxTime="22:00:00"
                allDaySlot={false}
                events={events}
                editable={true}
                droppable={true}
                eventDrop={handleEventDrop}
                eventReceive={handleEventReceive}
                eventResize={handleEventResize}
                eventDragStop={handleEventDragStop}
                snapDuration="00:05:00"
                height="100%"
                dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
                slotLabelFormat={{ hour: 'numeric', meridiem: 'short' }}
                eventDurationEditable={true}
                eventContent={renderEventContent}
                nowIndicator={true}
            />
        </div>
    );
}
