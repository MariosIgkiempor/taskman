import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TaskController from '@/actions/App/Http/Controllers/TaskController';

export function TaskForm() {
    const form = useForm({ title: '' });

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(TaskController.store.url(), {
            preserveScroll: true,
            onSuccess: () => form.reset('title'),
        });
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
                placeholder="New task..."
                value={form.data.title}
                onChange={(e) => form.setData('title', e.target.value)}
                className="flex-1"
            />
            <Button type="submit" size="sm" disabled={form.processing || !form.data.title.trim()}>
                Add
            </Button>
        </form>
    );
}
