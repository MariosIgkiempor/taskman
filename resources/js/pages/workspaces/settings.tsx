import { Head, router, useForm } from "@inertiajs/react";
import { useState } from "react";
import WorkspaceController from "@/actions/App/Http/Controllers/WorkspaceController";
import Heading from "@/components/heading";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AppLayout from "@/layouts/app-layout";
import type { BreadcrumbItem, Workspace, WorkspaceRole } from "@/types";

interface Props {
  workspace: Workspace;
  role: WorkspaceRole;
}

export default function WorkspaceSettings({ workspace, role }: Props) {
  const breadcrumbs: BreadcrumbItem[] = [
    {
      title: workspace.name,
      href: WorkspaceController.settings.url(workspace),
    },
    {
      title: "Settings",
      href: WorkspaceController.settings.url(workspace),
    },
  ];

  const form = useForm({ name: workspace.name });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const canManage = role === "owner" || role === "admin";
  const isOwner = role === "owner";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    form.patch(WorkspaceController.update.url(workspace), {
      preserveScroll: true,
    });
  };

  const handleDelete = () => {
    router.delete(WorkspaceController.destroy.url(workspace));
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`${workspace.name} - Settings`} />

      <div className="mx-auto w-full max-w-2xl space-y-8 p-6">
        <Heading title="Workspace Settings" description="Manage your workspace configuration." />

        {/* Name */}
        <div className="space-y-4">
          <Heading variant="small" title="General" />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workspace name</Label>
              <Input
                id="name"
                value={form.data.name}
                onChange={(e) => form.setData("name", e.target.value)}
                disabled={!canManage || workspace.is_personal}
                className="max-w-xs"
              />
            </div>
            {canManage && !workspace.is_personal && (
              <Button type="submit" size="sm" disabled={form.processing || !form.data.name.trim()}>
                Save
              </Button>
            )}
          </form>
        </div>

        {/* Danger zone */}
        {isOwner && !workspace.is_personal && (
          <div className="space-y-4 rounded-lg border border-destructive/30 p-4">
            <Heading
              variant="small"
              title="Danger Zone"
              description="Permanently delete this workspace and all its data."
            />
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              Delete Workspace
            </Button>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete {workspace.name}?</DialogTitle>
                  <DialogDescription>
                    This will permanently delete the workspace, all its boards, tasks, and tags.
                    This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleDelete}>
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
