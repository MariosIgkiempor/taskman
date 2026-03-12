import type { Auth } from "@/types/auth";
import type { Workspace } from "@/types/workspace";

declare module "@inertiajs/core" {
  export interface InertiaConfig {
    sharedPageProps: {
      name: string;
      auth: Auth;
      sidebarOpen: boolean;
      unreadNotificationsCount: number;
      currentWorkspace: Workspace;
      workspaces: Workspace[];
      [key: string]: unknown;
    };
  }
}
