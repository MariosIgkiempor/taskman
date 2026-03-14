import { Link, usePage } from "@inertiajs/react";
import { ChevronRight, Home, Plus } from "lucide-react";
import WorkspaceController from "@/actions/App/Http/Controllers/WorkspaceController";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
    SidebarGroup,
    SidebarGroupAction,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { useCurrentUrl } from "@/hooks/use-current-url";
import { index as tasksIndex } from "@/routes/tasks";
import { index as workspacesIndex } from "@/routes/workspaces";
import type { Workspace } from "@/types";

function WorkspaceIcon({ workspace }: { workspace: Workspace }) {
    if (workspace.is_personal) {
        return <Home className="size-4" />;
    }

    return (
        <span className="flex size-4 items-center justify-center font-bold text-[0.625rem]">
            {workspace.name.charAt(0).toUpperCase()}
        </span>
    );
}

function TeamWorkspaceItem({ workspace, isActive }: { workspace: Workspace; isActive: boolean }) {
    const { isCurrentUrl } = useCurrentUrl();

    const canManage = workspace.pivot?.role === "owner" || workspace.pivot?.role === "admin";

    return (
        <Collapsible defaultOpen={isActive} className="group/collapsible">
            <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive} tooltip={{ children: workspace.name }}>
                    <Link href={tasksIndex.url(workspace)} prefetch>
                        <WorkspaceIcon workspace={workspace} />
                        <span className="font-medium">{workspace.name}</span>
                    </Link>
                </SidebarMenuButton>
                <CollapsibleTrigger asChild>
                    <SidebarMenuAction className="transition-transform data-[state=open]:rotate-90">
                        <ChevronRight />
                        <span className="sr-only">Toggle</span>
                    </SidebarMenuAction>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <SidebarMenuSub>
                        <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                                asChild
                                isActive={isCurrentUrl(WorkspaceController.members.url(workspace))}
                            >
                                <Link href={WorkspaceController.members.url(workspace)} prefetch>
                                    <span>Members</span>
                                </Link>
                            </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        {canManage && (
                            <SidebarMenuSubItem>
                                <SidebarMenuSubButton
                                    asChild
                                    isActive={isCurrentUrl(WorkspaceController.settings.url(workspace))}
                                >
                                    <Link href={WorkspaceController.settings.url(workspace)} prefetch>
                                        <span>Settings</span>
                                    </Link>
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        )}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </SidebarMenuItem>
        </Collapsible>
    );
}

export function NavWorkspaces() {
    const { currentWorkspace, workspaces } = usePage().props;
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel className="font-bold text-[0.65rem] text-sidebar-foreground/40 uppercase tracking-widest">
                Workspaces
            </SidebarGroupLabel>
            <SidebarGroupAction className="top-1.5" asChild>
                <Link href={workspacesIndex.url()}>
                    <Plus />
                    <span className="sr-only">Create Workspace</span>
                </Link>
            </SidebarGroupAction>
            <SidebarMenu>
                {workspaces.map((ws) => {
                    const isActive = isCurrentOrParentUrl(tasksIndex.url(ws));
                    const isCurrentWs = currentWorkspace?.id === ws.id;

                    if (!ws.is_personal) {
                        return (
                            <TeamWorkspaceItem key={ws.id} workspace={ws} isActive={isActive || isCurrentWs} />
                        );
                    }

                    return (
                        <SidebarMenuItem key={ws.id}>
                            <SidebarMenuButton
                                asChild
                                isActive={isActive || isCurrentWs}
                                tooltip={{ children: ws.name }}
                            >
                                <Link href={tasksIndex.url(ws)} prefetch>
                                    <WorkspaceIcon workspace={ws} />
                                    <span className="font-medium">{ws.name}</span>
                                </Link>
                            </SidebarMenuButton>
                            {ws.open_tasks_count > 0 && (
                                <SidebarMenuBadge>{ws.open_tasks_count}</SidebarMenuBadge>
                            )}
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
