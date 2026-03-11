import { useCallback, useMemo, useRef, useState } from 'react';
import { TagBadge } from '@/components/tags/tag-badge';
import {
    Popover,
    PopoverAnchor,
    PopoverContent,
} from '@/components/ui/popover';
import { tagColorKeys, tagColors } from '@/lib/tag-colors';
import type { Tag } from '@/types';

interface TaskTagInputProps {
    taskTags: Tag[];
    allTags: Tag[];
    onTagAdd: (tagId: number) => void;
    onTagRemove: (tagId: number) => void;
    onTagCreate: (name: string, color: string) => void;
}

export function TaskTagInput({
    taskTags,
    allTags,
    onTagAdd,
    onTagRemove,
    onTagCreate,
}: TaskTagInputProps) {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [rawHighlightIndex, setHighlightIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const selectedIds = useMemo(
        () => new Set(taskTags.map((t) => t.id)),
        [taskTags],
    );

    const suggestions = useMemo(() => {
        const q = query.toLowerCase().trim();
        return allTags.filter(
            (t) => !selectedIds.has(t.id) && (!q || t.name.toLowerCase().includes(q)),
        );
    }, [allTags, selectedIds, query]);

    const exactMatch = useMemo(
        () =>
            query.trim() !== '' &&
            allTags.some(
                (t) => t.name.toLowerCase() === query.trim().toLowerCase(),
            ),
        [allTags, query],
    );

    const showCreate = query.trim() !== '' && !exactMatch;

    // Total items: suggestions + optional "Create" row
    const totalItems = suggestions.length + (showCreate ? 1 : 0);

    // Clamp highlight so it stays in bounds when list shrinks
    const highlightIndex = totalItems > 0 ? Math.min(rawHighlightIndex, totalItems - 1) : 0;

    const clearAndClose = useCallback(() => {
        setQuery('');
        setIsOpen(false);
    }, []);

    const selectSuggestion = useCallback(
        (tag: Tag) => {
            onTagAdd(tag.id);
            setQuery('');
            inputRef.current?.focus();
        },
        [onTagAdd],
    );

    const createTag = useCallback(() => {
        const name = query.trim();
        if (!name) return;
        const color = tagColorKeys[allTags.length % tagColorKeys.length];
        onTagCreate(name, color);
        setQuery('');
        inputRef.current?.focus();
    }, [query, allTags.length, onTagCreate]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Backspace' && query === '' && taskTags.length > 0) {
                onTagRemove(taskTags[taskTags.length - 1].id);
                return;
            }

            if (!isOpen || totalItems === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightIndex((i) => (i + 1) % totalItems);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightIndex((i) => (i - 1 + totalItems) % totalItems);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                if (highlightIndex < suggestions.length) {
                    selectSuggestion(suggestions[highlightIndex]);
                } else if (showCreate) {
                    createTag();
                }
            }
        },
        [
            query,
            taskTags,
            isOpen,
            totalItems,
            highlightIndex,
            suggestions,
            showCreate,
            onTagRemove,
            selectSuggestion,
            createTag,
        ],
    );

    const handleFocus = useCallback(() => {
        if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
            blurTimeoutRef.current = null;
        }
        setIsOpen(true);
    }, []);

    const handleBlur = useCallback(() => {
        blurTimeoutRef.current = setTimeout(() => {
            clearAndClose();
        }, 150);
    }, [clearAndClose]);

    const handleContainerMouseDown = useCallback(
        (e: React.MouseEvent) => {
            // Don't steal focus from input if clicking on the container itself
            if (e.target === e.currentTarget) {
                e.preventDefault();
                inputRef.current?.focus();
            }
        },
        [],
    );

    return (
        <Popover open={isOpen} onOpenChange={(open) => { if (!open) clearAndClose(); }}>
            <PopoverAnchor asChild>
                <div
                    className="flex flex-wrap items-center gap-1"
                    onMouseDown={handleContainerMouseDown}
                >
                    {taskTags.map((tag) => (
                        <TagBadge
                            key={tag.id}
                            tag={tag}
                            size="sm"
                            onRemove={() => onTagRemove(tag.id)}
                        />
                    ))}
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setHighlightIndex(0);
                        }}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        placeholder={taskTags.length === 0 ? 'Add tags...' : ''}
                        className="h-6 min-w-[80px] flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
                    />
                </div>
            </PopoverAnchor>
            <PopoverContent
                side="bottom"
                align="start"
                sideOffset={4}
                className="w-56 p-1"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
            >
                <div className="max-h-40 overflow-y-auto">
                    {suggestions.map((tag, index) => {
                        const colors = tagColors[tag.color] ?? tagColors.gray;
                        return (
                            <button
                                key={tag.id}
                                type="button"
                                className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs ${
                                    index === highlightIndex
                                        ? 'bg-accent text-accent-foreground'
                                        : ''
                                }`}
                                onMouseEnter={() => setHighlightIndex(index)}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    selectSuggestion(tag);
                                }}
                            >
                                <span
                                    className={`${colors.dot} size-2 shrink-0 rounded-full`}
                                />
                                {tag.name}
                            </button>
                        );
                    })}
                    {showCreate && (
                        <button
                            type="button"
                            className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs ${
                                highlightIndex === suggestions.length
                                    ? 'bg-accent text-accent-foreground'
                                    : ''
                            }`}
                            onMouseEnter={() =>
                                setHighlightIndex(suggestions.length)
                            }
                            onMouseDown={(e) => {
                                e.preventDefault();
                                createTag();
                            }}
                        >
                            Create &ldquo;{query.trim()}&rdquo;
                        </button>
                    )}
                    {suggestions.length === 0 && !showCreate && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">
                            No tags available
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
