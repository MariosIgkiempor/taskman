import { useDroppable } from "@dnd-kit/core";
import type React from "react";
import { TaskCard } from "@/components/tasks/task-card";
import type { Task } from "@/types";

interface CalendarSlotProps {
  id: string;
  tasks: Task[];
  onTaskClick: (task: Task, event: React.MouseEvent) => void;
}

export function CalendarSlot({ id, tasks, onTaskClick }: CalendarSlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[3rem] border-r border-b p-0.5 transition-colors ${
        isOver ? "bg-primary/10" : ""
      }`}
    >
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} onTaskClick={onTaskClick} />
      ))}
    </div>
  );
}
