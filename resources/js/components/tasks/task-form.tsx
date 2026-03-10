import { useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import type { FormEventHandler } from 'react';
import { useCallback, useRef } from 'react';
import TagController from '@/actions/App/Http/Controllers/TagController';
import TaskController from '@/actions/App/Http/Controllers/TaskController';
import { TagBadge } from '@/components/tags/tag-badge';
import { TagPicker } from '@/components/tags/tag-picker';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from '@/components/ui/input-group';
import {
    Popover,
    PopoverAnchor,
    PopoverContent,
} from '@/components/ui/popover';
import { useTagPicker } from '@/hooks/use-tag-picker';
import { requestJson } from '@/lib/request-json';
import type { Tag } from '@/types';

interface TaskFormProps {
    tags: Tag[];
    onTagCreated: (tag: Tag) => void;
}

export function TaskForm({ tags, onTagCreated }: TaskFormProps) {
    const form = useForm<{ title: string; tag_ids: number[] }>({
        title: '',
        tag_ids: [],
    });
    const inputRef = useRef<HTMLInputElement>(null);
    const { isOpen, searchQuery, close, removeHashText } = useTagPicker(
        form.data.title,
    );

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(TaskController.store.url(), {
            preserveScroll: true,
            onSuccess: () => {
                form.setData({ title: '', tag_ids: [] });
            },
        });
    };

    const handleToggleTag = useCallback(
        (tagId: number) => {
            form.setData((current) => {
                const newTitle = removeHashText(current.title);
                const newIds = current.tag_ids.includes(tagId)
                    ? current.tag_ids.filter((id) => id !== tagId)
                    : [...current.tag_ids, tagId];

                return { ...current, title: newTitle, tag_ids: newIds };
            });
            close();
            inputRef.current?.focus();
        },
        [form, removeHashText, close],
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
                        title: removeHashText(current.title),
                        tag_ids: [...current.tag_ids, response.id],
                    }));
                    close();
                    inputRef.current?.focus();
                } catch {
                    // Keep the current form state if tag creation fails.
                }
            })();
        },
        [form, removeHashText, close, onTagCreated],
    );

    const handleRemoveTag = useCallback(
        (tagId: number) => {
            form.setData((current) => ({
                ...current,
                tag_ids: current.tag_ids.filter((id) => id !== tagId),
            }));
        },
        [form],
    );

    const selectedTags = tags.filter((tag) =>
        form.data.tag_ids.includes(tag.id),
    );

    return (
        <div className="space-y-2">
            <form onSubmit={handleSubmit}>
                <InputGroup>
                    <Popover
                        open={isOpen}
                        onOpenChange={(open) => {
                            if (!open) close();
                        }}
                        modal={false}
                    >
                        <PopoverAnchor asChild>
                            <InputGroupInput
                                ref={inputRef}
                                placeholder="Add a task... (# for tags)"
                                value={form.data.title}
                                onChange={(e) =>
                                    form.setData('title', e.target.value)
                                }
                            />
                        </PopoverAnchor>
                        <PopoverContent
                            className="border-0 bg-transparent p-0 shadow-none"
                            side="bottom"
                            align="start"
                            sideOffset={4}
                            onOpenAutoFocus={(e) => e.preventDefault()}
                            onCloseAutoFocus={(e) => e.preventDefault()}
                            onInteractOutside={() => close()}
                        >
                            <TagPicker
                                tags={tags}
                                selectedTagIds={form.data.tag_ids}
                                onToggle={handleToggleTag}
                                onCreate={handleCreateTag}
                                onClose={close}
                                searchQuery={searchQuery}
                            />
                        </PopoverContent>
                    </Popover>
                    <InputGroupAddon align="inline-end">
                        <InputGroupButton
                            type="submit"
                            size="icon-xs"
                            disabled={
                                form.processing || !form.data.title.trim()
                            }
                            aria-label="Add task"
                        >
                            <Plus />
                        </InputGroupButton>
                    </InputGroupAddon>
                </InputGroup>
            </form>
            {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1 px-1">
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
        </div>
    );
}
