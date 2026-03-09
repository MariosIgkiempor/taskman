import { useForm, useHttp } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { FormEventHandler, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { TagBadge } from '@/components/tags/tag-badge';
import { TagPicker } from '@/components/tags/tag-picker';
import { useTagPicker } from '@/hooks/use-tag-picker';
import TaskController from '@/actions/App/Http/Controllers/TaskController';
import TagController from '@/actions/App/Http/Controllers/TagController';
import type { Tag } from '@/types';

interface TaskFormProps {
    tags: Tag[];
    onTagCreated: (tag: Tag) => void;
}

export function TaskForm({ tags, onTagCreated }: TaskFormProps) {
    const form = useForm<{ title: string; tag_ids: number[] }>({ title: '', tag_ids: [] });
    const tagCreate = useHttp<{ name: string; color: string }, Tag>({ name: '', color: '' });
    const inputRef = useRef<HTMLInputElement>(null);
    const { isOpen, searchQuery, close, removeHashText } = useTagPicker(form.data.title);

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
            const newTitle = removeHashText(form.data.title);
            const currentIds = form.data.tag_ids;
            const newIds = currentIds.includes(tagId) ? currentIds.filter((id) => id !== tagId) : [...currentIds, tagId];
            form.setData({ ...form.data, title: newTitle, tag_ids: newIds });
            close();
            inputRef.current?.focus();
        },
        [form, removeHashText, close],
    );

    const handleCreateTag = useCallback(
        (name: string, color: string) => {
            tagCreate.setData({ name, color });
            tagCreate.post(TagController.store.url(), {
                onSuccess: (response: Tag) => {
                    onTagCreated(response);
                    const newTitle = removeHashText(form.data.title);
                    form.setData({ ...form.data, title: newTitle, tag_ids: [...form.data.tag_ids, response.id] });
                    close();
                    inputRef.current?.focus();
                },
            });
        },
        [form, tagCreate, removeHashText, close, onTagCreated],
    );

    const handleRemoveTag = useCallback(
        (tagId: number) => {
            form.setData('tag_ids', form.data.tag_ids.filter((id) => id !== tagId));
        },
        [form],
    );

    const selectedTags = tags.filter((tag) => form.data.tag_ids.includes(tag.id));

    return (
        <div className="space-y-2">
            <form onSubmit={handleSubmit} className="flex gap-2">
                <Popover open={isOpen} onOpenChange={(open) => { if (!open) close(); }} modal={false}>
                    <PopoverAnchor asChild>
                        <Input
                            ref={inputRef}
                            placeholder="Add a task... (# for tags)"
                            value={form.data.title}
                            onChange={(e) => form.setData('title', e.target.value)}
                            className="flex-1 bg-card"
                        />
                    </PopoverAnchor>
                    <PopoverContent
                        className="p-0 border-0 shadow-none bg-transparent"
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
                <Button type="submit" size="sm" disabled={form.processing || !form.data.title.trim()}>
                    <Plus className="size-4" />
                    Add
                </Button>
            </form>
            {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1 px-1">
                    {selectedTags.map((tag) => (
                        <TagBadge key={tag.id} tag={tag} size="sm" onRemove={() => handleRemoveTag(tag.id)} />
                    ))}
                </div>
            )}
        </div>
    );
}
