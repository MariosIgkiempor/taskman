import { Head, Link, useForm } from '@inertiajs/react';
import { Home, Plus } from 'lucide-react';
import WorkspaceController from '@/actions/App/Http/Controllers/WorkspaceController';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { index as tasksIndex } from '@/routes/tasks';
import { index as workspacesIndex } from '@/routes/workspaces';
import type { Board, BreadcrumbItem, Workspace } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Workspaces',
        href: workspacesIndex.url(),
    },
];

type WorkspaceWithBoards = Workspace & { boards: Board[] };

export default function WorkspacesIndex({
    workspaces,
}: {
    workspaces: WorkspaceWithBoards[];
}) {
    const form = useForm({ name: '' });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.data.name.trim()) return;
        form.post(WorkspaceController.store.url(), {
            onSuccess: () => form.reset(),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Workspaces" />

            <div className="mx-auto w-full max-w-2xl space-y-8 p-6">
                <Heading
                    title="Workspaces"
                    description="Manage your workspaces and create new ones."
                />

                {/* Create workspace */}
                <form
                    onSubmit={handleSubmit}
                    className="flex items-center gap-3"
                >
                    <Input
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        placeholder="New workspace name..."
                        className="max-w-xs"
                    />
                    <Button
                        type="submit"
                        size="sm"
                        disabled={form.processing || !form.data.name.trim()}
                    >
                        <Plus className="mr-1 size-4" />
                        Create
                    </Button>
                </form>

                {/* Workspace list */}
                <div className="space-y-2">
                    {workspaces.map((ws) => (
                        <Link
                            key={ws.id}
                            href={tasksIndex.url(ws)}
                            className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                        >
                            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                                {ws.is_personal ? (
                                    <Home className="size-4" />
                                ) : (
                                    <span className="text-sm font-bold">
                                        {ws.name.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="font-medium">{ws.name}</div>
                                <div className="text-xs text-muted-foreground">
                                    {ws.boards.length}{' '}
                                    {ws.boards.length === 1
                                        ? 'board'
                                        : 'boards'}
                                </div>
                            </div>
                            {ws.is_personal && (
                                <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                    Personal
                                </span>
                            )}
                        </Link>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
