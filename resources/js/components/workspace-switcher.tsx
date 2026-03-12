import { Link, usePage } from "@inertiajs/react";
import { ChevronsUpDown, Home, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { index as tasksIndex } from "@/routes/tasks";
import { index as workspacesIndex } from "@/routes/workspaces";

export function WorkspaceSwitcher() {
  const { currentWorkspace, workspaces } = usePage().props;
  const { state } = useSidebar();
  const isMobile = useIsMobile();

  const activeWorkspace = currentWorkspace ?? workspaces[0];

  if (!activeWorkspace) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <div className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                {activeWorkspace.is_personal ? (
                  <Home className="size-3.5" />
                ) : (
                  <span className="font-bold text-xs">
                    {activeWorkspace.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="truncate font-semibold text-sm">{activeWorkspace.name}</span>
                {activeWorkspace.pivot?.role && (
                  <span className="text-[0.625rem] text-muted-foreground">
                    {activeWorkspace.pivot.role}
                  </span>
                )}
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : state === "collapsed" ? "right" : "bottom"}
          >
            {workspaces.map((ws) => (
              <DropdownMenuItem key={ws.id} asChild>
                <Link href={tasksIndex.url(ws)} className="flex items-center gap-2">
                  <div className="flex size-5 items-center justify-center rounded bg-primary/10 text-primary">
                    {ws.is_personal ? (
                      <Home className="size-3" />
                    ) : (
                      <span className="font-bold text-[0.625rem]">
                        {ws.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="flex-1 truncate">{ws.name}</span>
                  {ws.pivot?.role && ws.pivot.role !== "owner" && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[0.6rem] text-muted-foreground">
                      {ws.pivot.role}
                    </span>
                  )}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={workspacesIndex.url()} className="flex items-center gap-2">
                <Plus className="size-4" />
                <span>Create Workspace</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
