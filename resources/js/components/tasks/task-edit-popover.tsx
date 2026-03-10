import { router } from '@inertiajs/react';
import { Check, Circle, Tag as TagIcon, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TagController from '@/actions/App/Http/Controllers/TagController';
import TaskController from '@/actions/App/Http/Controllers/TaskController';
import TaskTagController from '@/actions/App/Http/Controllers/TaskTagController';
import { TagBadge } from '@/components/tags/tag-badge';
import { TagPicker } from '@/components/tags/tag-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverAnchor,
    PopoverContent,
} from '@/components/ui/popover';
import { requestJson } from '@/lib/request-json';
import type { Tag, Task } from '@/types';

interface TaskEditPopoverProps {
    task: Task | null;
    anchorPoint: { x: number; y: number } | null;
    tags: Tag[];
    onClose: () => void;
    onTagCreated: (tag: Tag) => void;
    onTagUpdated: (tag: Tag) => void;
}

export function TaskEditPopover({
    task,
    anchorPoint,
    tags,
    onClose,
    onTagCreated,
    onTagUpdated,
}: TaskEditPopoverProps) {
    const isOpen = task !== null && anchorPoint !== null;

    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    return (
        <Popover
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) handleClose();
            }}
            modal={false}
        >
            <PopoverAnchor
                style={
                    anchorPoint
                        ? {
                              position: 'fixed',
                              left: anchorPoint.x,
                              top: anchorPoint.y,
                              width: 0,
                              height: 0,
                              pointerEvents: 'none',
                          }
                        : undefined
                }
            />
            <PopoverContent
                side="right"
                align="start"
                sideOffset={12}
                collisionPadding={16}
                className="w-80 p-0"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
            >
                {task && (
                    <TaskEditForm
                        key={task.id}
                        task={task}
                        tags={tags}
                        onClose={onClose}
                        onTagCreated={onTagCreated}
                        onTagUpdated={onTagUpdated}
                    />
                )}
            </PopoverContent>
        </Popover>
    );
}

interface TaskEditFormProps {
    task: Task;
    tags: Tag[];
    onClose: () => void;
    onTagCreated: (tag: Tag) => void;
    onTagUpdated: (tag: Tag) => void;
}

function TaskEditForm({
    task,
    tags,
    onClose,
    onTagCreated,
    onTagUpdated,
}: TaskEditFormProps) {
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description ?? '');
    const [showTagPicker, setShowTagPicker] = useState(false);
    const [tagSearch, setTagSearch] = useState('');
    const [taskTags, setTaskTags] = useState<Tag[]>(task.tags);
    const pendingRef = useRef<{ title: string; description: string } | null>(
        null,
    );
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const titleRef = useRef<HTMLInputElement>(null);
    const taskRef = useRef(task);
    const taskTagsRef = useRef<Tag[]>(task.tags);

    // Keep taskRef in sync for use in callbacks
    useEffect(() => {
        taskRef.current = task;
    }, [task]);

    // Update optimistic tag state when task prop changes (e.g. after Inertia reload)
    useEffect(() => {
        const nextTaskTags = task.tags;
        taskTagsRef.current = nextTaskTags;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTaskTags(nextTaskTags);
    }, [task]);

    const pickerTags = useMemo(() => {
        const taskTagsById = new Map(taskTags.map((tag) => [tag.id, tag]));

        return tags.map((tag) => taskTagsById.get(tag.id) ?? tag);
    }, [tags, taskTags]);

    // Auto-select title on mount
    useEffect(() => {
        const timer = setTimeout(() => titleRef.current?.select(), 50);
        return () => clearTimeout(timer);
    }, []);

    const flushSave = useCallback(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }
        const currentTask = taskRef.current;
        if (pendingRef.current && currentTask) {
            const data: Record<string, string> = {};
            if (pendingRef.current.title !== currentTask.title) {
                data.title = pendingRef.current.title;
            }
            if (
                pendingRef.current.description !==
                (currentTask.description ?? '')
            ) {
                data.description = pendingRef.current.description;
            }
            if (Object.keys(data).length > 0) {
                router.patch(TaskController.update.url(currentTask.id), data, {
                    preserveScroll: true,
                });
            }
            pendingRef.current = null;
        }
    }, []);

    const scheduleSave = useCallback(
        (newTitle: string, newDescription: string) => {
            pendingRef.current = {
                title: newTitle,
                description: newDescription,
            };
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
            debounceRef.current = setTimeout(() => {
                flushSave();
            }, 500);
        },
        [flushSave],
    );

    const handleTitleChange = (value: string) => {
        setTitle(value);
        scheduleSave(value, description);
    };

    const handleDescriptionChange = (value: string) => {
        setDescription(value);
        scheduleSave(title, value);
    };

    const handleToggleComplete = () => {
        flushSave();
        router.patch(
            TaskController.update.url(task.id),
            { is_completed: !task.is_completed },
            { preserveScroll: true },
        );
    };

    const handleDelete = () => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }
        pendingRef.current = null;
        router.delete(TaskController.destroy.url(task.id), {
            preserveScroll: true,
        });
        onClose();
    };

    const handleToggleTag = useCallback(
        (tagId: number) => {
            const currentTask = taskRef.current;
            const previousTags = taskTagsRef.current;
            const currentIds = previousTags.map((tag) => tag.id);
            const newIds = currentIds.includes(tagId)
                ? currentIds.filter((id) => id !== tagId)
                : [...currentIds, tagId];
            const nextTags = tags.filter((tag) => newIds.includes(tag.id));

            taskTagsRef.current = nextTags;
            setTaskTags(nextTags);

            void requestJson<Tag[]>(
                'patch',
                TaskTagController.sync.url(currentTask.id),
                { tag_ids: newIds },
            )
                .then(() => {
                    router.reload();
                })
                .catch(() => {
                    taskTagsRef.current = previousTags;
                    setTaskTags(previousTags);
                });
        },
        [tags],
    );

    const handleCreateTag = useCallback(
        (name: string, color: string) => {
            const currentTask = taskRef.current;

            void (async () => {
                try {
                    const response = await requestJson<Tag>(
                        'post',
                        TagController.store.url(),
                        { name, color },
                    );
                    onTagCreated(response);
                    const previousTags = taskTagsRef.current;
                    const nextTags = [...previousTags, response];

                    taskTagsRef.current = nextTags;
                    setTaskTags(nextTags);

                    try {
                        await requestJson<Tag[]>(
                            'patch',
                            TaskTagController.sync.url(currentTask.id),
                            {
                                tag_ids: nextTags.map((tag) => tag.id),
                            },
                        );

                        setTagSearch('');
                        router.reload();
                    } catch {
                        taskTagsRef.current = previousTags;
                        setTaskTags(previousTags);
                    }
                } catch {
                    // Leave the current selection alone if tag creation fails.
                }
            })();
        },
        [onTagCreated],
    );

    const handleChangeTagColor = useCallback(
        (tagId: number, color: string) => {
            const previousTags = taskTagsRef.current;
            const nextTags = previousTags.map((tag) =>
                tag.id === tagId ? { ...tag, color } : tag,
            );

            taskTagsRef.current = nextTags;
            setTaskTags(nextTags);

            void requestJson<Tag>('patch', TagController.update.url(tagId), {
                color,
            })
                .then((response) => {
                    onTagUpdated(response);
                    router.reload();
                })
                .catch(() => {
                    taskTagsRef.current = previousTags;
                    setTaskTags(previousTags);
                });
        },
        [onTagUpdated],
    );

    const handleRemoveTag = useCallback((tagId: number) => {
        const currentTask = taskRef.current;
        const previousTags = taskTagsRef.current;
        const nextTags = previousTags.filter((tag) => tag.id !== tagId);

        taskTagsRef.current = nextTags;
        setTaskTags(nextTags);

        void requestJson<Tag[]>(
            'patch',
            TaskTagController.sync.url(currentTask.id),
            {
                tag_ids: nextTags.map((tag) => tag.id),
            },
        )
            .then(() => {
                router.reload();
            })
            .catch(() => {
                taskTagsRef.current = previousTags;
                setTaskTags(previousTags);
            });
    }, []);

    // Flush pending save and cleanup debounce on unmount
    useEffect(() => {
        return () => {
            flushSave();
        };
    }, [flushSave]);

    return (
        <div className="flex flex-col">
            {/* Title */}
            <div className="px-3 pt-3">
                <Input
                    ref={titleRef}
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="border-0 px-0 text-sm font-semibold shadow-none focus-visible:ring-0"
                    placeholder="Task title..."
                />
            </div>

            {/* Description */}
            <div className="px-3 pb-1">
                <textarea
                    value={description}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    placeholder="Add a description..."
                    rows={2}
                    className="w-full resize-none bg-transparent text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/50"
                />
            </div>

            {/* Tags */}
            {taskTags.length > 0 && (
                <div className="flex flex-wrap gap-1 px-3 pb-2">
                    {taskTags.map((tag) => (
                        <TagBadge
                            key={tag.id}
                            tag={tag}
                            size="sm"
                            onRemove={() => handleRemoveTag(tag.id)}
                            onColorChange={(color) =>
                                handleChangeTagColor(tag.id, color)
                            }
                        />
                    ))}
                </div>
            )}

            {/* Actions bar */}
            <div className="flex items-center gap-1 border-t border-border/50 px-2 py-1.5">
                <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 gap-1.5 px-2 text-xs ${task.is_completed ? 'text-primary' : 'text-muted-foreground'}`}
                    onClick={handleToggleComplete}
                >
                    {task.is_completed ? (
                        <Check className="size-3" />
                    ) : (
                        <Circle className="size-3" />
                    )}
                    {task.is_completed ? 'Completed' : 'Complete'}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
                    onClick={() => setShowTagPicker(!showTagPicker)}
                >
                    <TagIcon className="size-3" />
                    Tags
                </Button>
                <div className="flex-1" />
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:!text-destructive"
                    onClick={handleDelete}
                >
                    <Trash2 className="size-3" />
                    Delete
                </Button>
            </div>

            {/* Inline tag picker */}
            {showTagPicker && (
                <div className="border-t border-border/50">
                    <div className="px-2 pt-1.5 pb-1">
                        <Input
                            value={tagSearch}
                            onChange={(e) => setTagSearch(e.target.value)}
                            placeholder="Search or create tag..."
                            className="h-7 border-0 px-1 text-xs shadow-none focus-visible:ring-0"
                        />
                    </div>
                    <TagPicker
                        tags={pickerTags}
                        selectedTagIds={taskTags.map((tag) => tag.id)}
                        onToggle={handleToggleTag}
                        onCreate={handleCreateTag}
                        onClose={() => setShowTagPicker(false)}
                        searchQuery={tagSearch}
                        inline
                    />
                </div>
            )}
        </div>
    );
}
