import { Head, router, usePage } from '@inertiajs/react';
import { Copy, Link2, Trash2, UserMinus } from 'lucide-react';
import { useState } from 'react';
import WorkspaceController from '@/actions/App/Http/Controllers/WorkspaceController';
import WorkspaceInviteController from '@/actions/App/Http/Controllers/WorkspaceInviteController';
import WorkspaceMemberController from '@/actions/App/Http/Controllers/WorkspaceMemberController';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useClipboard } from '@/hooks/use-clipboard';
import AppLayout from '@/layouts/app-layout';
import type {
    BreadcrumbItem,
    Workspace,
    WorkspaceInvite,
    WorkspaceMember,
    WorkspaceRole,
} from '@/types';

interface Props {
    workspace: Workspace;
    members: WorkspaceMember[];
    invites: WorkspaceInvite[];
    role: WorkspaceRole;
}

export default function WorkspaceMembers({
    workspace,
    members,
    invites,
    role,
}: Props) {
    const { auth } = usePage().props;
    const [copiedText, copy] = useClipboard();
    const [removingMember, setRemovingMember] =
        useState<WorkspaceMember | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: workspace.name,
            href: WorkspaceController.members.url(workspace),
        },
        {
            title: 'Members',
            href: WorkspaceController.members.url(workspace),
        },
    ];

    const canManage = role === 'owner' || role === 'admin';

    const handleRoleChange = (member: WorkspaceMember, newRole: string) => {
        router.patch(
            WorkspaceMemberController.update.url({
                workspace,
                member,
            }),
            { role: newRole },
            { preserveScroll: true },
        );
    };

    const handleRemoveMember = () => {
        if (!removingMember) return;
        router.delete(
            WorkspaceMemberController.destroy.url({
                workspace,
                member: removingMember,
            }),
            { preserveScroll: true },
        );
        setRemovingMember(null);
    };

    const handleCreateInvite = () => {
        router.post(
            WorkspaceInviteController.store.url(workspace),
            {},
            { preserveScroll: true },
        );
    };

    const handleRevokeInvite = (invite: WorkspaceInvite) => {
        router.delete(WorkspaceInviteController.destroy.url(invite), {
            preserveScroll: true,
        });
    };

    const getInviteUrl = (invite: WorkspaceInvite) => {
        return `${window.location.origin}/invite/${invite.token}`;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${workspace.name} - Members`} />

            <div className="mx-auto w-full max-w-2xl space-y-8 p-6">
                <Heading
                    title="Members"
                    description="Manage workspace members and invitations."
                />

                {/* Members list */}
                <div className="space-y-3">
                    {members.map((member) => {
                        const isCurrentUser = member.id === auth.user?.id;
                        const isOwner = member.role === 'owner';

                        return (
                            <div
                                key={member.id}
                                className="flex items-center gap-3 rounded-lg border p-3"
                            >
                                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                                    {member.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium">
                                        {member.name}
                                        {isCurrentUser && (
                                            <span className="ml-1 text-muted-foreground">
                                                (you)
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {member.email}
                                    </div>
                                </div>

                                {canManage && !isOwner ? (
                                    <Select
                                        value={member.role}
                                        onValueChange={(value) =>
                                            handleRoleChange(member, value)
                                        }
                                    >
                                        <SelectTrigger className="h-8 w-28">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">
                                                Admin
                                            </SelectItem>
                                            <SelectItem value="member">
                                                Member
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <span className="rounded bg-muted px-2 py-1 text-xs capitalize text-muted-foreground">
                                        {member.role}
                                    </span>
                                )}

                                {/* Remove button */}
                                {!isOwner &&
                                    (canManage || isCurrentUser) && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                            onClick={() =>
                                                setRemovingMember(member)
                                            }
                                        >
                                            {isCurrentUser ? (
                                                <UserMinus className="size-4" />
                                            ) : (
                                                <Trash2 className="size-4" />
                                            )}
                                        </Button>
                                    )}
                            </div>
                        );
                    })}
                </div>

                {/* Invite section */}
                {canManage && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Heading
                                variant="small"
                                title="Invite Links"
                                description="Share a link to let others join this workspace."
                            />
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCreateInvite}
                            >
                                <Link2 className="mr-1 size-4" />
                                Generate Link
                            </Button>
                        </div>

                        {invites.length > 0 && (
                            <div className="space-y-2">
                                {invites.map((invite) => (
                                    <div
                                        key={invite.id}
                                        className="flex items-center gap-2 rounded-lg border p-3"
                                    >
                                        <code className="flex-1 truncate text-xs text-muted-foreground">
                                            {getInviteUrl(invite)}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() =>
                                                copy(getInviteUrl(invite))
                                            }
                                        >
                                            <Copy className="size-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                            onClick={() =>
                                                handleRevokeInvite(invite)
                                            }
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {copiedText && (
                            <p className="text-xs text-green-600">
                                Link copied to clipboard!
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Remove member dialog */}
            <Dialog
                open={removingMember !== null}
                onOpenChange={(open) => {
                    if (!open) setRemovingMember(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {removingMember?.id === auth.user?.id
                                ? 'Leave workspace?'
                                : `Remove ${removingMember?.name}?`}
                        </DialogTitle>
                        <DialogDescription>
                            {removingMember?.id === auth.user?.id
                                ? 'You will lose access to this workspace and its tasks.'
                                : `${removingMember?.name} will lose access to this workspace.`}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setRemovingMember(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleRemoveMember}
                        >
                            {removingMember?.id === auth.user?.id
                                ? 'Leave'
                                : 'Remove'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
