import { useForm } from '@inertiajs/react';
import { Plus, Tag as TagIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import TagController from '@/actions/App/Http/Controllers/TagController';
import TaskController from '@/actions/App/Http/Controllers/TaskController';
import { LocationInput } from '@/components/location-input';
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
import type { Tag } from '@/types';

interface TaskCreatePopoverProps {
    isOpen: boolean;
    anchorRect: DOMRect | null;
    tags: Tag[];
    onClose: () => void;
    onTagCreated: (tag: Tag) => void;
}

export function TaskCreatePopover({
    isOpen,
    anchorRect,
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
    tags: Tag[];
    onClose: () => void;
    onTagCreated: (tag: Tag) => void;
}

function TaskCreateForm({ tags, onClose, onTagCreated }: TaskCreateFormProps) {
    const form = useForm<{
        title: string;
        description: string;
        location: string;
        location_coordinates: { lat: number; lng: number } | null;
        tag_ids: number[];
    }>({
        title: '',
        description: '',
        location: '',
        location_coordinates: null,
        tag_ids: [],
    });
    const [showTagPicker, setShowTagPicker] = useState(false);
    const [tagSearch, setTagSearch] = useState('');
    const titleRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => titleRef.current?.focus(), 50);
        return () => clearTimeout(timer);
    }, []);

    const handleSubmit = () => {
        if (!form.data.title.trim()) return;
        form.post(TaskController.store.url(), {
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
                        TagController.store.url(),
                        { name, color },
                    );
                    onTagCreated(response);
                    form.setData((current) => ({
                        ...current,
                        tag_ids: [...current.tag_ids, response.id],
                    }));
                    setTagSearch('');
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

            {/* Tags */}
            {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1 px-3 pb-2">
                    {selectedTags.map((tag) => (
                        <TagBadge
                            key={tag.id}
                            tag={tag}
                            size="sm"
                            onRemove={() => handleRemoveTag(tag.id)}
                        />
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
                    className="h-7 gap-1.5 px-2 text-xs text-primary"
                    disabled={form.processing || !form.data.title.trim()}
                    onClick={handleSubmit}
                >
                    <Plus className="size-3" />
                    Create
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
                        selectedTagIds={form.data.tag_ids}
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
