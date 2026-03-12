import { usePage } from "@inertiajs/react";
import { LayoutGrid, ListTodo, Settings, Users } from "lucide-react";
import WorkspaceController from "@/actions/App/Http/Controllers/WorkspaceController";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { dashboard } from "@/routes";
import { index as tasksIndex } from "@/routes/tasks";
import type { NavItem } from "@/types";

export function AppSidebar() {
  const { currentWorkspace } = usePage().props;

  const mainNavItems: NavItem[] = [
    {
      title: "Dashboard",
      href: dashboard(),
      icon: LayoutGrid,
    },
    {
      title: "Tasks",
      href: currentWorkspace ? tasksIndex.url(currentWorkspace) : dashboard(),
      icon: ListTodo,
    },
  ];

  if (currentWorkspace && !currentWorkspace.is_personal) {
    mainNavItems.push({
      title: "Members",
      href: WorkspaceController.members.url(currentWorkspace),
      icon: Users,
    });

    const canManage =
      currentWorkspace.pivot?.role === "owner" || currentWorkspace.pivot?.role === "admin";

    if (canManage) {
      mainNavItems.push({
        title: "Settings",
        href: WorkspaceController.settings.url(currentWorkspace),
        icon: Settings,
      });
    }
  }

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <WorkspaceSwitcher />
        <SidebarSeparator />
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={mainNavItems} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
