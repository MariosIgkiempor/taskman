import type {
    EventClickArg,
    EventContentArg,
    EventDropArg,
    EventResizeDoneArg,
} from '@fullcalendar/core';
import interactionPlugin, { Draggable } from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import TaskController from '@/actions/App/Http/Controllers/TaskController';
import { tagColors } from '@/lib/tag-colors';
import type { Tag, Task } from '@/types';

interface WeeklyCalendarProps {
    tasks: Task[];
    weekStart: string;
    sidebarRef: React.RefObject<HTMLDivElement | null>;
    selectedTagIds: Set<number>;
    onTaskClick: (task: Task, event: React.MouseEvent) => void;
}

export function WeeklyCalendar({
    tasks,
    weekStart,
    sidebarRef,
    selectedTagIds,
    onTaskClick,
}: WeeklyCalendarProps) {
    const calendarRef = useRef<FullCalendar>(null);
    const draggableRef = useRef<Draggable | null>(null);
    const tasksRef = useRef(tasks);

    useEffect(() => {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
            calendarApi.gotoDate(weekStart);
        }
    }, [weekStart]);

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

    const events = tasks
        .filter((task) => task.scheduled_at)
        .map((task) => ({
            id: `task-${task.id}`,
            title: task.title,
            start: task.scheduled_at!,
            end: new Date(
                new Date(task.scheduled_at!).getTime() +
                    task.duration_minutes * 60 * 1000,
            ).toISOString(),
            extendedProps: {
                taskId: task.id,
                isCompleted: task.is_completed,
                tags: task.tags,
            },
            classNames: [
                ...(task.is_completed ? ['fc-event-completed'] : []),
                ...(selectedTagIds.size > 0 && !task.tags.some((tag) => selectedTagIds.has(tag.id)) ? ['fc-event-dimmed'] : []),
            ],
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

    const handleEventReceive = (info: {
        event: {
            extendedProps: Record<string, unknown>;
            start: Date | null;
            remove: () => void;
        };
    }) => {
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
            const durationMinutes = Math.round(
                (end.getTime() - start.getTime()) / 60000,
            );
            router.patch(
                TaskController.schedule.url(taskId),
                {
                    scheduled_at: start.toISOString(),
                    duration_minutes: durationMinutes,
                },
                { preserveScroll: true },
            );
        }
    };

    const handleEventDragStop = (info: {
        event: { extendedProps: Record<string, unknown> };
        jsEvent: MouseEvent;
    }) => {
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
            router.patch(
                TaskController.unschedule.url(taskId),
                {},
                { preserveScroll: true },
            );
        }
    };

    const handleEventClick = (info: EventClickArg) => {
        const taskId = info.event.extendedProps.taskId as number;
        const task = tasksRef.current.find((t) => t.id === taskId);
        if (task) {
            onTaskClick(task, info.jsEvent as unknown as React.MouseEvent);
        }
    };

    const renderEventContent = (eventInfo: EventContentArg) => {
        const eventTags = (eventInfo.event.extendedProps.tags ?? []) as Tag[];

        return (
            <div className="flex flex-col gap-0.5 overflow-hidden">
                <div className="fc-event-time text-[0.6875rem] font-medium opacity-70">
                    {eventInfo.timeText}
                </div>
                <div className="fc-event-title truncate">
                    {eventInfo.event.title}
                </div>
                {eventTags.length > 0 && (
                    <div className="flex gap-1 pt-0.5">
                        {eventTags.map((tag) => {
                            const colors =
                                tagColors[tag.color] ?? tagColors.gray;
                            return (
                                <span
                                    key={tag.id}
                                    className={`${colors.dot} size-1.5 rounded-full`}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        );
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
                eventClick={handleEventClick}
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
