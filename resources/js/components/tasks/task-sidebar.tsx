import { useAutoAnimate } from '@formkit/auto-animate/react';
import { Inbox } from 'lucide-react';
import { forwardRef, useEffect, useMemo, useState } from 'react';
import { TagBadge } from '@/components/tags/tag-badge';
import { TagTimeBreakdown } from '@/components/tasks/tag-time-breakdown';
import { TaskCard } from '@/components/tasks/task-card';
import { TaskCreatePopover } from '@/components/tasks/task-create-popover';
import { TaskForm } from '@/components/tasks/task-form';
import type { Tag, Task } from '@/types';

interface TaskSidebarProps {
    tasks: Task[];
    scheduledTasks: Task[];
    tags: Tag[];
    selectedTagIds: Set<number>;
    onTagFilterToggle: (tagId: number) => void;
    onTagCreated: (tag: Tag) => void;
    onTaskClick: (task: Task, event: React.MouseEvent) => void;
}

export const TaskSidebar = forwardRef<HTMLDivElement, TaskSidebarProps>(
    function TaskSidebar(
        {
            tasks,
            scheduledTasks,
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
        const [createAnchorRect, setCreateAnchorRect] =
            useState<DOMRect | null>(null);

        const incompleteTasks = useMemo(
            () => tasks.filter((t) => !t.is_completed),
            [tasks],
        );
        const completedTasks = useMemo(
            () => tasks.filter((t) => t.is_completed),
            [tasks],
        );

        // Disable auto-animate during drag to avoid conflicts with FullCalendar's Draggable
        useEffect(() => {
            const container = typeof ref === 'object' ? ref?.current : null;
            if (!container) return;

            const handleDragStart = () => enableAnimations(false);
            const handleDragEnd = () => enableAnimations(true);

            container.addEventListener('dragstart', handleDragStart);
            container.addEventListener('dragend', handleDragEnd);

            return () => {
                container.removeEventListener('dragstart', handleDragStart);
                container.removeEventListener('dragend', handleDragEnd);
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
            <div className="flex h-full flex-col gap-4">
                <div className="flex items-center gap-2.5">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
                        <Inbox className="size-3.5 text-primary" />
                    </div>
                    <h2 className="text-sm font-bold tracking-tight">
                        Backlog
                    </h2>
                    {incompleteTasks.length > 0 && (
                        <span className="ml-auto rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
                            {incompleteTasks.length}
                        </span>
                    )}
                </div>
                <TaskForm onOpen={handleOpenCreate} />
                <TaskCreatePopover
                    isOpen={createOpen}
                    anchorRect={createAnchorRect}
                    tags={tags}
                    onClose={handleCloseCreate}
                    onTagCreated={onTagCreated}
                />
                <div
                    ref={ref}
                    className="flex flex-1 flex-col gap-1 overflow-y-auto rounded-lg bg-muted/50 p-1.5 transition-colors"
                >
                    {tasks.length === 0 && (
                        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
                            <div className="rounded-xl bg-muted p-3">
                                <Inbox className="size-5 text-muted-foreground/40" />
                            </div>
                            <p className="text-xs font-medium text-muted-foreground/60">
                                No tasks yet
                            </p>
                        </div>
                    )}
                    <div ref={animateRef} className="flex flex-col gap-1">
                        {incompleteTasks.map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                dimmed={
                                    selectedTagIds.size > 0 &&
                                    !task.tags.some((tag) =>
                                        selectedTagIds.has(tag.id),
                                    )
                                }
                                onTaskClick={onTaskClick}
                            />
                        ))}
                        {completedTasks.length > 0 && (
                            <div
                                key="completed-divider"
                                className="flex items-center gap-2 px-2 pt-2 pb-1"
                            >
                                <div className="h-px flex-1 bg-border/60" />
                                <span className="text-[0.6875rem] font-medium text-muted-foreground/50">
                                    Completed
                                </span>
                                <div className="h-px flex-1 bg-border/60" />
                            </div>
                        )}
                        {completedTasks.map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                dimmed={
                                    selectedTagIds.size > 0 &&
                                    !task.tags.some((tag) =>
                                        selectedTagIds.has(tag.id),
                                    )
                                }
                                onTaskClick={onTaskClick}
                            />
                        ))}
                    </div>
                </div>
                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-1">
                        {tags.map((tag) => (
                            <button
                                key={tag.id}
                                type="button"
                                aria-pressed={selectedTagIds.has(tag.id)}
                                aria-label={`Filter by ${tag.name}`}
                                onClick={() => onTagFilterToggle(tag.id)}
                                className={`transition-opacity ${
                                    selectedTagIds.size === 0 ||
                                    selectedTagIds.has(tag.id)
                                        ? 'opacity-100'
                                        : 'opacity-40'
                                }`}
                            >
                                <TagBadge tag={tag} size="sm" />
                            </button>
                        ))}
                    </div>
                )}
                <div className="border-t border-border/40 pt-3">
                    <TagTimeBreakdown tasks={scheduledTasks} />
                </div>
            </div>
        );
    },
);
