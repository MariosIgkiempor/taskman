import type {
    EventApi,
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
import { TaskCheckbox } from '@/components/ui/task-checkbox';
import { tagColors } from '@/lib/tag-colors';
import type { Tag, Task } from '@/types';

const SHADOW_EVENT_ID = 'duplicate-shadow';

interface WeeklyCalendarProps {
    tasks: Task[];
    weekStart: string;
    sidebarRef: React.RefObject<HTMLDivElement | null>;
    selectedTagIds: Set<number>;
    onTaskClick: (task: Task, event: React.MouseEvent) => void;
    onScheduledWithNotifiedReminders: (task: Task) => void;
}

export function WeeklyCalendar({
    tasks,
    weekStart,
    sidebarRef,
    selectedTagIds,
    onTaskClick,
    onScheduledWithNotifiedReminders,
}: WeeklyCalendarProps) {
    const calendarRef = useRef<FullCalendar>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const draggableRef = useRef<Draggable | null>(null);
    const tasksRef = useRef(tasks);
    const isDuplicatingRef = useRef(false);
    const isDraggingRef = useRef(false);

    useEffect(() => {
        tasksRef.current = tasks;
    }, [tasks]);

    useEffect(() => {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
            calendarApi.gotoDate(weekStart);
        }
    }, [weekStart]);

    useEffect(() => {
        const container = containerRef.current;
        const calendarApi = calendarRef.current?.getApi();
        if (!container || !calendarApi) {
            return;
        }

        const observer = new ResizeObserver(() => {
            calendarApi.updateSize();
        });
        observer.observe(container);

        return () => observer.disconnect();
    }, []);

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

    const draggedEventRef = useRef<{
        title: string;
        start: Date | null;
        end: Date | null;
        extendedProps: Record<string, unknown>;
    } | null>(null);

    const addShadowEvent = (calendarApi: ReturnType<FullCalendar['getApi']>) => {
        if (calendarApi.getEventById(SHADOW_EVENT_ID)) {
            return;
        }

        const origEvent = draggedEventRef.current;
        if (!origEvent) {
            return;
        }

        calendarApi.addEvent({
            id: SHADOW_EVENT_ID,
            title: origEvent.title,
            start: origEvent.start!,
            end: origEvent.end!,
            classNames: ['fc-event-duplicating'],
            editable: false,
            extendedProps: origEvent.extendedProps,
        });
    };

    const removeShadowEvent = (calendarApi: ReturnType<FullCalendar['getApi']>) => {
        calendarApi.getEventById(SHADOW_EVENT_ID)?.remove();
    };

    // Track alt key state during drag via mousemove only.
    // keydown/keyup are unreliable on macOS during pointer-captured drags.
    useEffect(() => {
        const syncAltState = (e: MouseEvent) => {
            if (!isDraggingRef.current) {
                return;
            }

            const wasAlt = isDuplicatingRef.current;
            isDuplicatingRef.current = e.altKey;

            const calendarApi = calendarRef.current?.getApi();
            if (!calendarApi) {
                return;
            }

            // Toggled into duplicate mode mid-drag — add shadow
            if (e.altKey && !wasAlt) {
                addShadowEvent(calendarApi);
            }

            // Toggled out of duplicate mode mid-drag — remove shadow
            if (!e.altKey && wasAlt) {
                removeShadowEvent(calendarApi);
            }
        };

        document.addEventListener('mousemove', syncAltState);
        return () => {
            document.removeEventListener('mousemove', syncAltState);
        };
    }, []);

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
                ...(selectedTagIds.size > 0 &&
                !task.tags.some((tag) => selectedTagIds.has(tag.id))
                    ? ['fc-event-dimmed']
                    : []),
            ],
        }));

    const handleEventDragStart = (info: {
        el: HTMLElement;
        event: EventApi;
        jsEvent: MouseEvent;
    }) => {
        isDraggingRef.current = true;
        isDuplicatingRef.current = info.jsEvent.altKey;

        // Store original event data for shadow creation
        draggedEventRef.current = {
            title: info.event.title,
            start: info.event.start,
            end: info.event.end,
            extendedProps: { ...info.event.extendedProps },
        };

        if (info.jsEvent.altKey) {
            const calendarApi = calendarRef.current?.getApi();
            if (calendarApi) {
                addShadowEvent(calendarApi);
            }
        }
    };

    const handleEventDrop = (info: EventDropArg) => {
        const taskId = info.event.extendedProps.taskId;
        const newStart = info.event.start;

        if (!taskId || !newStart) {
            return;
        }

        const duplicating = isDuplicatingRef.current;

        // Clean up drag state
        isDuplicatingRef.current = false;
        isDraggingRef.current = false;
        draggedEventRef.current = null;

        // Remove shadow event
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
            removeShadowEvent(calendarApi);
        }

        if (duplicating) {
            info.revert();

            // Brief blink on original after revert
            requestAnimationFrame(() => {
                const liveEl = calendarApi?.getEventById(info.event.id)?.el;
                if (liveEl) {
                    liveEl.classList.add('fc-event-duplicating');
                    setTimeout(
                        () =>
                            liveEl.classList.remove('fc-event-duplicating'),
                        1500,
                    );
                }
            });

            router.post(
                TaskController.duplicate.url(taskId),
                { scheduled_at: newStart.toISOString() },
                { preserveScroll: true },
            );
        } else {
            const task = tasksRef.current.find((t) => t.id === taskId);
            router.patch(
                TaskController.schedule.url(taskId),
                { scheduled_at: newStart.toISOString() },
                { preserveScroll: true },
            );
            if (task?.reminders.some((r) => r.notified_at)) {
                onScheduledWithNotifiedReminders(task);
            }
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
            const task = tasksRef.current.find((t) => t.id === taskId);
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
            if (task?.reminders.some((r) => r.notified_at)) {
                onScheduledWithNotifiedReminders(task);
            }
        }
    };

    const handleEventDragStop = (info: {
        event: { extendedProps: Record<string, unknown> };
        jsEvent: MouseEvent;
    }) => {
        const wasDuplicating = isDuplicatingRef.current;

        // Remove shadow event
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
            removeShadowEvent(calendarApi);
        }

        // Defer ref cleanup so handleEventDrop can read the state first
        // (eventDragStop fires before eventDrop)
        setTimeout(() => {
            isDuplicatingRef.current = false;
            isDraggingRef.current = false;
            draggedEventRef.current = null;
        }, 0);

        // Don't unschedule during a duplicate drag
        if (wasDuplicating) {
            return;
        }

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

    const handleToggleComplete = (taskId: number, isCompleted: boolean) => {
        router.patch(
            TaskController.update.url(taskId),
            { is_completed: !isCompleted },
            { preserveScroll: true },
        );
    };

    const renderEventContent = (eventInfo: EventContentArg) => {
        const eventTags = (eventInfo.event.extendedProps.tags ?? []) as Tag[];
        const taskId = eventInfo.event.extendedProps.taskId as number;
        const isCompleted =
            eventInfo.event.extendedProps.isCompleted as boolean;

        return (
            <div className="flex flex-col gap-0.5 overflow-hidden">
                <div className="fc-event-time text-[0.6875rem] font-medium opacity-70">
                    {eventInfo.timeText}
                </div>
                <div className="flex items-center gap-1.5">
                    <TaskCheckbox
                        checked={isCompleted}
                        onCheckedChange={() =>
                            handleToggleComplete(taskId, isCompleted)
                        }
                        className="size-3.5"
                    />
                    <div className="fc-event-title truncate">
                        {eventInfo.event.title}
                    </div>
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
        <div
            ref={containerRef}
            className="h-full overflow-hidden rounded-lg bg-card [&_.fc]:h-full"
        >
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
                eventDragStart={handleEventDragStart}
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
