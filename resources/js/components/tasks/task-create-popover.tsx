import { useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import TagController from '@/actions/App/Http/Controllers/TagController';
import TaskController from '@/actions/App/Http/Controllers/TaskController';
import { LocationInput } from '@/components/location-input';
import { TaskTagInput } from '@/components/tags/task-tag-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverAnchor,
    PopoverContent,
} from '@/components/ui/popover';
import { requestJson } from '@/lib/request-json';
import type { Board, Tag, Workspace } from '@/types';

interface TaskCreatePopoverProps {
    isOpen: boolean;
    anchorRect: DOMRect | null;
    workspace: Workspace;
    boards: Board[];
    selectedBoardId: number | null;
    tags: Tag[];
    onClose: () => void;
    onTagCreated: (tag: Tag) => void;
}

export function TaskCreatePopover({
    isOpen,
    anchorRect,
    workspace,
    boards,
    selectedBoardId,
    tags,
    onClose,
    onTagCreated,
}: TaskCreatePopoverProps) {
    return (
        <Popover
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            modal={false}
        >
            <PopoverAnchor
                style={{
                    position: 'fixed',
                    left: anchorRect?.left ?? 0,
                    top: anchorRect?.top ?? 0,
                    width: anchorRect?.width ?? 0,
                    height: anchorRect?.height ?? 0,
                    pointerEvents: 'none',
                }}
            />
            <PopoverContent
                side="bottom"
                align="start"
                sideOffset={anchorRect ? -anchorRect.height : 0}
                collisionPadding={16}
                className="origin-top p-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98]"
                style={anchorRect ? { width: anchorRect.width } : undefined}
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
            >
                {isOpen && (
                    <TaskCreateForm
                        workspace={workspace}
                        boards={boards}
                        selectedBoardId={selectedBoardId}
                        tags={tags}
                        onClose={onClose}
                        onTagCreated={onTagCreated}
                    />
                )}
            </PopoverContent>
        </Popover>
    );
}

interface TaskCreateFormProps {
    workspace: Workspace;
    boards: Board[];
    selectedBoardId: number | null;
    tags: Tag[];
    onClose: () => void;
    onTagCreated: (tag: Tag) => void;
}

function TaskCreateForm({ workspace, boards, selectedBoardId, tags, onClose, onTagCreated }: TaskCreateFormProps) {
    const defaultBoardId = selectedBoardId ?? boards[0]?.id;
    const form = useForm<{
        title: string;
        description: string;
        location: string;
        location_coordinates: { lat: number; lng: number } | null;
        board_id: number;
        tag_ids: number[];
    }>({
        title: '',
        description: '',
        location: '',
        location_coordinates: null,
        board_id: defaultBoardId,
        tag_ids: [],
    });
    const titleRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => titleRef.current?.focus(), 50);
        return () => clearTimeout(timer);
    }, []);

    const handleSubmit = () => {
        if (!form.data.title.trim()) return;
        form.post(TaskController.store.url(workspace), {
            preserveScroll: true,
            onSuccess: () => {
                onClose();
            },
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleToggleTag = useCallback(
        (tagId: number) => {
            form.setData((current) => {
                const newIds = current.tag_ids.includes(tagId)
                    ? current.tag_ids.filter((id) => id !== tagId)
                    : [...current.tag_ids, tagId];
                return { ...current, tag_ids: newIds };
            });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const handleCreateTag = useCallback(
        (name: string, color: string) => {
            void (async () => {
                try {
                    const response = await requestJson<Tag>(
                        'post',
                        TagController.store.url(workspace),
                        { name, color },
                    );
                    onTagCreated(response);
                    form.setData((current) => ({
                        ...current,
                        tag_ids: [...current.tag_ids, response.id],
                    }));
                } catch {
                    // Keep the current form state if tag creation fails.
                }
            })();
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [onTagCreated],
    );

    const handleRemoveTag = useCallback(
        (tagId: number) => {
            form.setData((current) => ({
                ...current,
                tag_ids: current.tag_ids.filter((id) => id !== tagId),
            }));
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const selectedTags = tags.filter((tag) =>
        form.data.tag_ids.includes(tag.id),
    );

    return (
        <div className="flex flex-col">
            {/* Title */}
            <div className="px-3 pt-3">
                <Input
                    ref={titleRef}
                    value={form.data.title}
                    onChange={(e) => form.setData('title', e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="border-0 px-0 text-sm font-semibold shadow-none focus-visible:ring-0"
                    placeholder="Task title..."
                />
            </div>

            {/* Description */}
            <div className="px-3 pb-1">
                <textarea
                    value={form.data.description}
                    onChange={(e) =>
                        form.setData('description', e.target.value)
                    }
                    placeholder="Add a description..."
                    rows={2}
                    className="w-full resize-none bg-transparent text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/50"
                />
            </div>

            {/* Location */}
            <div className="px-3 pb-1">
                <LocationInput
                    value={form.data.location}
                    coordinates={form.data.location_coordinates}
                    onChange={(loc, coords) => {
                        form.setData((current) => ({
                            ...current,
                            location: loc,
                            location_coordinates: coords,
                        }));
                    }}
                    placeholder="Add a location..."
                />
            </div>

            {/* Board selector */}
            {boards.length > 1 && (
                <div className="px-3 pb-1">
                    <select
                        value={form.data.board_id}
                        onChange={(e) =>
                            form.setData('board_id', Number(e.target.value))
                        }
                        className="w-full rounded-md border-0 bg-muted/50 px-2 py-1 text-xs text-muted-foreground outline-none"
                    >
                        {boards.map((board) => (
                            <option key={board.id} value={board.id}>
                                {board.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Tags */}
            <div className="px-3 pb-1">
                <TaskTagInput
                    taskTags={selectedTags}
                    allTags={tags}
                    onTagAdd={handleToggleTag}
                    onTagRemove={handleRemoveTag}
                    onTagCreate={handleCreateTag}
                />
            </div>

            {/* Actions bar */}
            <div className="flex items-center gap-1 border-t border-border/50 px-2 py-1.5">
                <div className="flex-1" />
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 px-2 text-xs text-primary"
                    disabled={form.processing || !form.data.title.trim()}
                    onClick={handleSubmit}
                >
                    <Plus className="size-3" />
                    Create
                </Button>
            </div>

        </div>
    );
}
