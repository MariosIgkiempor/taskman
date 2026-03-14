import { Head, router, usePage } from "@inertiajs/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TaskReminderController from "@/actions/App/Http/Controllers/TaskReminderController";
import { BoardTabs } from "@/components/tasks/board-tabs";
import { TaskEditPopover } from "@/components/tasks/task-edit-popover";
import { TaskSidebar } from "@/components/tasks/task-sidebar";
import { WeekNavigator } from "@/components/tasks/week-navigator";
import { WeeklyCalendar } from "@/components/tasks/weekly-calendar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AppLayout from "@/layouts/app-layout";
import { requestJson } from "@/lib/request-json";
import { index as tasksIndex } from "@/routes/tasks";
import type { Board, BreadcrumbItem, Tag, Task, Workspace } from "@/types";

interface Props {
  workspace: Workspace;
  boards: Board[];
  unscheduledTasks: Task[];
  scheduledTasks: Task[];
  completedTasks: Task[];
  currentWeekStart: string;
  tags: Tag[];
}

export default function TasksIndex({
  workspace,
  boards,
  unscheduledTasks,
  scheduledTasks,
  completedTasks,
  currentWeekStart,
  tags,
}: Props) {
  const breadcrumbs: BreadcrumbItem[] = [
    {
      title: workspace.name,
      href: tasksIndex.url(workspace),
    },
  ];

  const { url } = usePage();
  const deepLinkHandled = useRef(false);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const [localTags, setLocalTags] = useState<Tag[]>(tags);
  const [prevTags, setPrevTags] = useState<Tag[]>(tags);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [sourceElement, setSourceElement] = useState<HTMLElement | null>(null);
  const [rearmTask, setRearmTask] = useState<Task | null>(null);
  const [prevWeekStart, setPrevWeekStart] = useState(currentWeekStart);

  if (currentWeekStart !== prevWeekStart) {
    setPrevWeekStart(currentWeekStart);
    setEditingTask(null);
    setSourceElement(null);
  }

  if (tags !== prevTags) {
    setPrevTags(tags);
    setLocalTags(tags);
    const validIds = new Set(tags.map((t) => t.id));
    setSelectedTagIds((prev) => {
      const next = new Set([...prev].filter((id) => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }

  // Deep-link: auto-open a task from URL ?task=ID (e.g. from dashboard)
  useEffect(() => {
    if (deepLinkHandled.current) return;

    const params = new URLSearchParams(url.split("?")[1] ?? "");
    const taskId = params.get("task");
    if (!taskId) return;

    const id = Number(taskId);
    const allTasks = [...unscheduledTasks, ...scheduledTasks, ...completedTasks];
    const found = allTasks.find((t) => t.id === id);
    if (!found) return;

    deepLinkHandled.current = true;

    // Clean the URL so the param doesn't persist on reload
    const cleanUrl = url.split("?")[0];
    const remaining = new URLSearchParams(params);
    remaining.delete("task");
    const qs = remaining.toString();
    window.history.replaceState({}, "", qs ? `${cleanUrl}?${qs}` : cleanUrl);

    // Wait for FullCalendar / sidebar to render, then find the element
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-task-id="${id}"]`);
      setEditingTask(found);
      setSourceElement(el);
    });
  }, [url, unscheduledTasks, scheduledTasks, completedTasks]);

  const filteredUnscheduledTasks = useMemo(
    () =>
      selectedBoardId === null
        ? unscheduledTasks
        : unscheduledTasks.filter((t) => t.board_id === selectedBoardId),
    [unscheduledTasks, selectedBoardId],
  );

  const filteredCompletedTasks = useMemo(
    () =>
      selectedBoardId === null
        ? completedTasks
        : completedTasks.filter((t) => t.board_id === selectedBoardId),
    [completedTasks, selectedBoardId],
  );

  const handleTagCreated = useCallback((tag: Tag) => {
    setLocalTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
  }, []);

  const handleTagFilterToggle = useCallback((tagId: number) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  }, []);

  const handleTaskClick = useCallback(
    (task: Task, event: React.MouseEvent, sourceEl?: HTMLElement) => {
      setEditingTask(task);
      setSourceElement(sourceEl ?? (event.currentTarget as HTMLElement));
    },
    [],
  );

  const handleCloseEdit = useCallback(() => {
    setEditingTask(null);
    setSourceElement(null);
  }, []);

  const handleScheduledWithNotifiedReminders = useCallback((task: Task) => {
    setRearmTask(task);
  }, []);

  const handleRearm = useCallback(() => {
    if (!rearmTask) return;
    void requestJson("patch", TaskReminderController.rearm.url(rearmTask.id)).then(() => {
      router.reload();
    });
    setRearmTask(null);
  }, [rearmTask]);

  // Find the latest version of the editing task from props (it may have been updated by Inertia reload)
  const currentEditingTask = editingTask
    ? ([...unscheduledTasks, ...scheduledTasks, ...completedTasks].find(
        (t) => t.id === editingTask.id,
      ) ?? editingTask)
    : null;

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Tasks" />
      <div className="grid min-h-0 flex-1 grid-cols-[320px_1fr] gap-0 p-0">
        <div className="flex min-h-0 flex-col border-border/40 border-r p-4">
          <div className="mb-3 shrink-0">
            <BoardTabs
              boards={boards}
              selectedBoardId={selectedBoardId}
              onSelectBoard={setSelectedBoardId}
            />
          </div>
          <TaskSidebar
            ref={sidebarRef}
            workspace={workspace}
            boards={boards}
            selectedBoardId={selectedBoardId}
            tasks={filteredUnscheduledTasks}
            scheduledTasks={scheduledTasks}
            completedTasks={filteredCompletedTasks}
            tags={localTags}
            selectedTagIds={selectedTagIds}
            onTagFilterToggle={handleTagFilterToggle}
            onTagCreated={handleTagCreated}
            onTaskClick={handleTaskClick}
          />
        </div>
        <div className="flex min-h-0 flex-col gap-3 overflow-hidden p-4">
          <WeekNavigator weekStart={currentWeekStart} />
          <div className="min-h-0 flex-1">
            <WeeklyCalendar
              tasks={scheduledTasks}
              boards={boards}
              weekStart={currentWeekStart}
              sidebarRef={sidebarRef}
              selectedTagIds={selectedTagIds}
              onTaskClick={handleTaskClick}
              onScheduledWithNotifiedReminders={handleScheduledWithNotifiedReminders}
            />
          </div>
        </div>
      </div>
      <TaskEditPopover
        task={currentEditingTask}
        sourceElement={sourceElement}
        workspace={workspace}
        tags={localTags}
        onClose={handleCloseEdit}
        onTagCreated={handleTagCreated}
        onScheduledWithNotifiedReminders={handleScheduledWithNotifiedReminders}
      />
      <Dialog
        open={rearmTask !== null}
        onOpenChange={(open) => {
          if (!open) setRearmTask(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-arm reminders?</DialogTitle>
            <DialogDescription>
              Reminders for this task have already been sent. Would you like to re-arm them for the
              new scheduled time?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRearmTask(null)}>
              Skip
            </Button>
            <Button onClick={handleRearm}>Re-arm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
