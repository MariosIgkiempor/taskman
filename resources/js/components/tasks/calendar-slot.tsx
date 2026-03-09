import { useDroppable } from '@dnd-kit/core';
import { TaskCard } from '@/components/tasks/task-card';
import type { Task } from '@/types';

interface CalendarSlotProps {
    id: string;
    tasks: Task[];
}

export function CalendarSlot({ id, tasks }: CalendarSlotProps) {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            className={`min-h-[3rem] border-b border-r p-0.5 transition-colors ${
                isOver ? 'bg-primary/10' : ''
            }`}
        >
            {tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
            ))}
        </div>
    );
}
