import { router, useHttp } from '@inertiajs/react';
import { Tag as TagIcon, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TagBadge } from '@/components/tags/tag-badge';
import { TagPicker } from '@/components/tags/tag-picker';
import TaskController from '@/actions/App/Http/Controllers/TaskController';
import TaskTagController from '@/actions/App/Http/Controllers/TaskTagController';
import TagController from '@/actions/App/Http/Controllers/TagController';
import type { Tag, Task } from '@/types';

interface TaskEditPopoverProps {
    task: Task | null;
    anchorPoint: { x: number; y: number } | null;
    tags: Tag[];
    onClose: () => void;
    onTagCreated: (tag: Tag) => void;
}

export function TaskEditPopover({ task, anchorPoint, tags, onClose, onTagCreated }: TaskEditPopoverProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [showTagPicker, setShowTagPicker] = useState(false);
    const [tagSearch, setTagSearch] = useState('');
    const pendingRef = useRef<{ title: string; description: string } | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const titleRef = useRef<HTMLInputElement>(null);
    const taskRef = useRef(task);

    const tagSync = useHttp<{ tag_ids: number[] }>({ tag_ids: [] });
    const tagCreate = useHttp<{ name: string; color: string }, Tag>({ name: '', color: '' });

    const isOpen = task !== null && anchorPoint !== null;

    // Keep taskRef in sync, but only update title/description state when a new task is opened
    useEffect(() => {
        taskRef.current = task;
    }, [task]);

    const prevTaskIdRef = useRef<number | null>(null);
    useEffect(() => {
        if (task && task.id !== prevTaskIdRef.current) {
            prevTaskIdRef.current = task.id;
            setTitle(task.title);
            setDescription(task.description ?? '');
            setShowTagPicker(false);
            setTagSearch('');
            pendingRef.current = null;
        }
        if (!task) {
            prevTaskIdRef.current = null;
        }
    }, [task]);

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => titleRef.current?.select(), 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

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
            if (pendingRef.current.description !== (currentTask.description ?? '')) {
                data.description = pendingRef.current.description;
            }
            if (Object.keys(data).length > 0) {
                router.patch(TaskController.update.url(currentTask.id), data, { preserveScroll: true });
            }
            pendingRef.current = null;
        }
    }, []);

    const scheduleSave = useCallback(
        (newTitle: string, newDescription: string) => {
            pendingRef.current = { title: newTitle, description: newDescription };
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

    const handleClose = () => {
        flushSave();
        onClose();
    };

    const handleDelete = () => {
        const currentTask = taskRef.current;
        if (!currentTask) return;
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }
        pendingRef.current = null;
        router.delete(TaskController.destroy.url(currentTask.id), { preserveScroll: true });
        onClose();
    };

    const handleToggleTag = useCallback(
        (tagId: number) => {
            const currentTask = taskRef.current;
            if (!currentTask) return;
            const currentIds = currentTask.tags.map((t) => t.id);
            const newIds = currentIds.includes(tagId) ? currentIds.filter((id) => id !== tagId) : [...currentIds, tagId];
            tagSync.setData('tag_ids', newIds);
            tagSync.patch(TaskTagController.sync.url(currentTask.id), {
                onSuccess: () => router.reload(),
            });
        },
        [tagSync],
    );

    const handleCreateTag = useCallback(
        (name: string, color: string) => {
            const currentTask = taskRef.current;
            if (!currentTask) return;
            tagCreate.setData({ name, color });
            tagCreate.post(TagController.store.url(), {
                onSuccess: (response: Tag) => {
                    onTagCreated(response);
                    const currentIds = currentTask.tags.map((t) => t.id);
                    tagSync.setData('tag_ids', [...currentIds, response.id]);
                    tagSync.patch(TaskTagController.sync.url(currentTask.id), {
                        onSuccess: () => router.reload(),
                    });
                    setTagSearch('');
                },
            });
        },
        [tagCreate, tagSync, onTagCreated],
    );

    const handleRemoveTag = useCallback(
        (tagId: number) => {
            const currentTask = taskRef.current;
            if (!currentTask) return;
            const newIds = currentTask.tags.filter((t) => t.id !== tagId).map((t) => t.id);
            tagSync.setData('tag_ids', newIds);
            tagSync.patch(TaskTagController.sync.url(currentTask.id), {
                onSuccess: () => router.reload(),
            });
        },
        [tagSync],
    );

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    return (
        <Popover open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }} modal={false}>
            <PopoverAnchor
                style={anchorPoint ? {
                    position: 'fixed',
                    left: anchorPoint.x,
                    top: anchorPoint.y,
                    width: 0,
                    height: 0,
                    pointerEvents: 'none',
                } : undefined}
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
                                className="w-full resize-none bg-transparent text-xs text-muted-foreground placeholder:text-muted-foreground/50 outline-none"
                            />
                        </div>

                        {/* Tags */}
                        {task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 px-3 pb-2">
                                {task.tags.map((tag) => (
                                    <TagBadge key={tag.id} tag={tag} size="sm" onRemove={() => handleRemoveTag(tag.id)} />
                                ))}
                            </div>
                        )}

                        {/* Actions bar */}
                        <div className="flex items-center gap-1 border-t border-border/50 px-2 py-1.5">
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
                                    tags={tags}
                                    selectedTagIds={task.tags.map((t) => t.id)}
                                    onToggle={handleToggleTag}
                                    onCreate={handleCreateTag}
                                    onClose={() => setShowTagPicker(false)}
                                    searchQuery={tagSearch}
                                    inline
                                />
                            </div>
                        )}
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
