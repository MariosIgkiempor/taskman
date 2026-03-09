import { CalendarSlot } from '@/components/tasks/calendar-slot';
import type { Task } from '@/types';

interface WeeklyCalendarProps {
    tasks: Task[];
    weekStart: string;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6AM - 10PM
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatHour(hour: number): string {
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${display}${suffix}`;
}

function getSlotDatetime(weekStart: string, dayIndex: number, hour: number): string {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex);
    date.setHours(hour, 0, 0, 0);
    return date.toISOString();
}

function getTasksForSlot(tasks: Task[], weekStart: string, dayIndex: number, hour: number): Task[] {
    const slotDate = new Date(weekStart);
    slotDate.setDate(slotDate.getDate() + dayIndex);

    return tasks.filter((task) => {
        if (!task.scheduled_at) {
            return false;
        }
        const taskDate = new Date(task.scheduled_at);
        return (
            taskDate.getFullYear() === slotDate.getFullYear() &&
            taskDate.getMonth() === slotDate.getMonth() &&
            taskDate.getDate() === slotDate.getDate() &&
            taskDate.getHours() === hour
        );
    });
}

function getDayLabel(weekStart: string, dayIndex: number): string {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex);
    return `${DAY_NAMES[dayIndex]} ${date.getDate()}`;
}

export function WeeklyCalendar({ tasks, weekStart }: WeeklyCalendarProps) {
    return (
        <div className="overflow-auto rounded-lg border">
            <div className="grid min-w-[700px]" style={{ gridTemplateColumns: '4rem repeat(7, 1fr)' }}>
                {/* Header row */}
                <div className="sticky top-0 z-10 border-b border-r bg-muted p-2 text-xs font-medium text-muted-foreground" />
                {DAY_NAMES.map((_, dayIndex) => (
                    <div
                        key={dayIndex}
                        className="sticky top-0 z-10 border-b border-r bg-muted p-2 text-center text-xs font-medium"
                    >
                        {getDayLabel(weekStart, dayIndex)}
                    </div>
                ))}

                {/* Time slots */}
                {HOURS.map((hour) => (
                    <>
                        <div
                            key={`label-${hour}`}
                            className="border-b border-r p-1 text-right text-xs text-muted-foreground"
                        >
                            {formatHour(hour)}
                        </div>
                        {DAY_NAMES.map((_, dayIndex) => {
                            const slotId = `slot-${dayIndex}-${hour}`;
                            const slotDatetime = getSlotDatetime(weekStart, dayIndex, hour);
                            return (
                                <CalendarSlot
                                    key={slotId}
                                    id={`${slotId}|${slotDatetime}`}
                                    tasks={getTasksForSlot(tasks, weekStart, dayIndex, hour)}
                                />
                            );
                        })}
                    </>
                ))}
            </div>
        </div>
    );
}
