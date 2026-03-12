import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ChevronDown, Clock, Inbox } from "lucide-react";
import { forwardRef, useEffect, useState } from "react";
import { TagBadge } from "@/components/tags/tag-badge";
import { TagTimeBreakdown } from "@/components/tasks/tag-time-breakdown";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskCreatePopover } from "@/components/tasks/task-create-popover";
import { TaskForm } from "@/components/tasks/task-form";
import type { Board, Tag, Task, Workspace } from "@/types";

interface TaskSidebarProps {
  workspace: Workspace;
  boards: Board[];
  selectedBoardId: number | null;
  tasks: Task[];
  scheduledTasks: Task[];
  completedTasks: Task[];
  tags: Tag[];
  selectedTagIds: Set<number>;
  onTagFilterToggle: (tagId: number) => void;
  onTagCreated: (tag: Tag) => void;
  onTaskClick: (task: Task, event: React.MouseEvent) => void;
}

export const TaskSidebar = forwardRef<HTMLDivElement, TaskSidebarProps>(function TaskSidebar(
  {
    workspace,
    boards,
    selectedBoardId,
    tasks,
    scheduledTasks,
    completedTasks,
    tags,
    selectedTagIds,
    onTagFilterToggle,
    onTagCreated,
    onTaskClick,
  },
  ref,
) {
  const [animateRef, enableAnimations] = useAutoAnimate();
  const [createOpen, setCreateOpen] = useState(false);
  const [createAnchorRect, setCreateAnchorRect] = useState<DOMRect | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showWeeklySummary, setShowWeeklySummary] = useState(false);

  // Disable auto-animate during drag to avoid conflicts with FullCalendar's Draggable
  useEffect(() => {
    const container = typeof ref === "object" ? ref?.current : null;
    if (!container) return;

    const handleDragStart = () => enableAnimations(false);
    const handleDragEnd = () => enableAnimations(true);

    container.addEventListener("dragstart", handleDragStart);
    container.addEventListener("dragend", handleDragEnd);

    return () => {
      container.removeEventListener("dragstart", handleDragStart);
      container.removeEventListener("dragend", handleDragEnd);
    };
  }, [ref, enableAnimations]);

  const handleOpenCreate = (rect: DOMRect) => {
    setCreateAnchorRect(rect);
    setCreateOpen(true);
  };

  const handleCloseCreate = () => {
    setCreateOpen(false);
    setCreateAnchorRect(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2.5">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
          <Inbox className="size-3.5 text-primary" />
        </div>
        <h2 className="font-bold text-sm tracking-tight">Backlog</h2>
        {tasks.length > 0 && (
          <span className="ml-auto rounded-md bg-muted px-2 py-0.5 font-semibold text-muted-foreground text-xs tabular-nums">
            {tasks.length}
          </span>
        )}
      </div>

      {/* Create form */}
      <div className="shrink-0">
        <TaskForm onOpen={handleOpenCreate} />
        <TaskCreatePopover
          isOpen={createOpen}
          anchorRect={createAnchorRect}
          workspace={workspace}
          boards={boards}
          selectedBoardId={selectedBoardId}
          tags={tags}
          onClose={handleCloseCreate}
          onTagCreated={onTagCreated}
        />
      </div>

      {/* Scrollable task list */}
      <div
        ref={ref}
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto rounded-lg bg-muted/50 p-1.5 transition-colors"
      >
        {tasks.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
            <div className="rounded-xl bg-muted p-3">
              <Inbox className="size-5 text-muted-foreground/40" />
            </div>
            <p className="font-medium text-muted-foreground/60 text-xs">No tasks yet</p>
          </div>
        )}
        <div ref={animateRef} className="flex flex-col gap-1">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              dimmed={
                selectedTagIds.size > 0 && !task.tags.some((tag) => selectedTagIds.has(tag.id))
              }
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
      </div>

      {/* Tag filters */}
      {tags.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-1.5 px-1">
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              aria-pressed={selectedTagIds.has(tag.id)}
              aria-label={`Filter by ${tag.name}`}
              onClick={() => onTagFilterToggle(tag.id)}
              className={`transition-opacity ${
                selectedTagIds.size === 0 || selectedTagIds.has(tag.id)
                  ? "opacity-100"
                  : "opacity-40"
              }`}
            >
              <TagBadge tag={tag} size="sm" />
            </button>
          ))}
        </div>
      )}

      {/* Collapsible sections at the bottom */}
      <div className="flex shrink-0 flex-col border-border/40 border-t pt-2">
        {/* Completed toggle */}
        {completedTasks.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 font-medium text-muted-foreground text-xs hover:bg-muted/50"
            >
              <ChevronDown
                className={`size-3.5 transition-transform ${showCompleted ? "" : "-rotate-90"}`}
              />
              Completed
              <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-[0.6875rem] tabular-nums">
                {completedTasks.length}
              </span>
            </button>
            {showCompleted && (
              <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg bg-muted/50 p-1.5">
                {completedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    dimmed={
                      selectedTagIds.size > 0 &&
                      !task.tags.some((tag) => selectedTagIds.has(tag.id))
                    }
                    onTaskClick={onTaskClick}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Weekly summary toggle */}
        {scheduledTasks.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowWeeklySummary(!showWeeklySummary)}
              className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 font-medium text-muted-foreground text-xs hover:bg-muted/50"
            >
              <ChevronDown
                className={`size-3.5 transition-transform ${showWeeklySummary ? "" : "-rotate-90"}`}
              />
              <Clock className="size-3" />
              Weekly Summary
            </button>
            {showWeeklySummary && (
              <div className="px-1 pt-1 pb-1">
                <TagTimeBreakdown tasks={scheduledTasks} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
