import { router } from '@inertiajs/react';
import { Bell, Calendar, Check, Circle, Clock, Globe, Repeat, Tag as TagIcon, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TagController from '@/actions/App/Http/Controllers/TagController';
import RecurrenceSeriesController from '@/actions/App/Http/Controllers/RecurrenceSeriesController';
import TaskController from '@/actions/App/Http/Controllers/TaskController';
import TaskTagController from '@/actions/App/Http/Controllers/TaskTagController';
import { LocationInput } from '@/components/location-input';
import { TagBadge } from '@/components/tags/tag-badge';
import { TagPicker } from '@/components/tags/tag-picker';
import { RecurrencePicker, recurrenceLabel } from '@/components/tasks/recurrence-picker';
import type { RecurrencePickerHandle, RecurrenceRule } from '@/components/tasks/recurrence-picker';
import { RecurrenceScopeDialog } from '@/components/tasks/recurrence-scope-dialog';
import { ReminderPicker } from '@/components/tasks/reminder-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverAnchor,
    PopoverContent,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { requestJson } from '@/lib/request-json';
import type { RecurrenceScope, Tag, Task } from '@/types';

const DURATION_OPTIONS = [
    { value: '15', label: '15m' },
    { value: '30', label: '30m' },
    { value: '45', label: '45m' },
    { value: '60', label: '1h' },
    { value: '90', label: '1h 30m' },
    { value: '120', label: '2h' },
    { value: '150', label: '2h 30m' },
    { value: '180', label: '3h' },
    { value: '240', label: '4h' },
    { value: '360', label: '6h' },
    { value: '480', label: '8h' },
] as const;

interface TaskEditPopoverProps {
    task: Task | null;
    anchorPoint: { x: number; y: number } | null;
    tags: Tag[];
    onClose: () => void;
    onTagCreated: (tag: Tag) => void;
    onTagUpdated: (tag: Tag) => void;
    onScheduledWithNotifiedReminders: (task: Task) => void;
}

export function TaskEditPopover({
    task,
    anchorPoint,
    tags,
    onClose,
    onTagCreated,
    onTagUpdated,
    onScheduledWithNotifiedReminders,
}: TaskEditPopoverProps) {
    const isOpen = task !== null && anchorPoint !== null;

    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    return (
        <Popover
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) handleClose();
            }}
            modal={false}
        >
            <PopoverAnchor
                style={
                    anchorPoint
                        ? {
                              position: 'fixed',
                              left: anchorPoint.x,
                              top: anchorPoint.y,
                              width: 0,
                              height: 0,
                              pointerEvents: 'none',
                          }
                        : undefined
                }
            />
            <PopoverContent
                side="right"
                align="start"
                sideOffset={12}
                collisionPadding={16}
                className="w-80 p-0"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
            >
                {task && (
                    <TaskEditForm
                        key={task.id}
                        task={task}
                        tags={tags}
                        onClose={onClose}
                        onTagCreated={onTagCreated}
                        onTagUpdated={onTagUpdated}
                        onScheduledWithNotifiedReminders={onScheduledWithNotifiedReminders}
                    />
                )}
            </PopoverContent>
        </Popover>
    );
}

interface TaskEditFormProps {
    task: Task;
    tags: Tag[];
    onClose: () => void;
    onTagCreated: (tag: Tag) => void;
    onTagUpdated: (tag: Tag) => void;
    onScheduledWithNotifiedReminders: (task: Task) => void;
}

function TaskEditForm({
    task,
    tags,
    onClose,
    onTagCreated,
    onTagUpdated,
    onScheduledWithNotifiedReminders,
}: TaskEditFormProps) {
    const parseScheduledAt = (scheduledAt: string | null) => {
        if (!scheduledAt) return { date: '', time: '' };
        const d = new Date(scheduledAt);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return { date: `${year}-${month}-${day}`, time: `${hours}:${minutes}` };
    };

    const initialSchedule = parseScheduledAt(task.scheduled_at);
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description ?? '');
    const [scheduleDate, setScheduleDate] = useState(initialSchedule.date);
    const [scheduleTime, setScheduleTime] = useState(initialSchedule.time);
    const [durationMinutes, setDurationMinutes] = useState(
        String(task.duration_minutes),
    );
    const [location, setLocation] = useState(task.location ?? '');
    const [locationCoordinates, setLocationCoordinates] = useState(
        task.location_coordinates,
    );
    const [showTagPicker, setShowTagPicker] = useState(false);
    const [showReminderPicker, setShowReminderPicker] = useState(false);
    const [showRecurrencePicker, setShowRecurrencePicker] = useState(false);
    const [showRecurrenceDirtyPrompt, setShowRecurrenceDirtyPrompt] = useState(false);
    const [showDeleteScopeDialog, setShowDeleteScopeDialog] = useState(false);
    const [pendingEditChange, setPendingEditChange] = useState<{
        type: 'schedule';
        data: Record<string, unknown>;
    } | null>(null);
    const [tagSearch, setTagSearch] = useState('');
    const [taskTags, setTaskTags] = useState<Tag[]>(task.tags);
    const pendingRef = useRef<{ title: string; description: string } | null>(
        null,
    );
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const titleRef = useRef<HTMLInputElement>(null);
    const recurrencePickerRef = useRef<RecurrencePickerHandle>(null);
    const taskRef = useRef(task);
    const taskTagsRef = useRef<Tag[]>(task.tags);

    // Keep taskRef in sync for use in callbacks
    useEffect(() => {
        taskRef.current = task;
    }, [task]);

    // Update optimistic tag state when task prop changes (e.g. after Inertia reload)
    useEffect(() => {
        const nextTaskTags = task.tags;
        taskTagsRef.current = nextTaskTags;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTaskTags(nextTaskTags);
    }, [task]);

    // Keep scheduling state in sync when task prop changes
    useEffect(() => {
        const parsed = parseScheduledAt(task.scheduled_at);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setScheduleDate(parsed.date);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setScheduleTime(parsed.time);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDurationMinutes(String(task.duration_minutes));
    }, [task.scheduled_at, task.duration_minutes]);

    const pickerTags = useMemo(() => {
        const taskTagsById = new Map(taskTags.map((tag) => [tag.id, tag]));

        return tags.map((tag) => taskTagsById.get(tag.id) ?? tag);
    }, [tags, taskTags]);

    // Auto-select title on mount
    useEffect(() => {
        const timer = setTimeout(() => titleRef.current?.select(), 50);
        return () => clearTimeout(timer);
    }, []);

    const flushSave = useCallback(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }
        const currentTask = taskRef.current;
        if (pendingRef.current && currentTask) {
            const data: Record<string, string> = {};
            if (pendingRef.current.title !== currentTask.title) {
                data.title = pendingRef.current.title;
            }
            if (
                pendingRef.current.description !==
                (currentTask.description ?? '')
            ) {
                data.description = pendingRef.current.description;
            }
            if (Object.keys(data).length > 0) {
                if (currentTask.recurrence_series_id && !currentTask.is_recurrence_exception) {
                    data.recurrence_scope = 'single';
                }
                router.patch(TaskController.update.url(currentTask.id), data, {
                    preserveScroll: true,
                });
            }
            pendingRef.current = null;
        }
    }, []);

    const scheduleSave = useCallback(
        (newTitle: string, newDescription: string) => {
            pendingRef.current = {
                title: newTitle,
                description: newDescription,
            };
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
            debounceRef.current = setTimeout(() => {
                flushSave();
            }, 500);
        },
        [flushSave],
    );

    const handleTitleChange = (value: string) => {
        setTitle(value);
        scheduleSave(value, description);
    };

    const handleDescriptionChange = (value: string) => {
        setDescription(value);
        scheduleSave(title, value);
    };

    const handleLocationChange = (
        newLocation: string,
        coords: { lat: number; lng: number } | null,
    ) => {
        setLocation(newLocation);
        setLocationCoordinates(coords);
        if (coords || newLocation === '') {
            router.patch(
                TaskController.update.url(taskRef.current.id),
                {
                    location: newLocation || null,
                    location_coordinates: coords,
                },
                { preserveScroll: true },
            );
        }
    };

    const handleOpenDirections = () => {
        if (!locationCoordinates || !task.scheduled_at) return;
        const { lat, lng } = locationCoordinates;
        const arrivalTime = new Date(
            new Date(task.scheduled_at).getTime() - 15 * 60 * 1000,
        );
        const epochSeconds = Math.floor(arrivalTime.getTime() / 1000);
        const openMaps = (origin: string) => {
            const url = `https://www.google.com/maps/dir/${origin}/${lat},${lng}/data=!3m1!4b1!4m6!4m5!2m3!6e1!7e2!8j${epochSeconds}!3e0`;
            window.open(url, '_blank');
        };
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => openMaps(`${pos.coords.latitude},${pos.coords.longitude}`),
                () => openMaps(''),
                { timeout: 5000 },
            );
        } else {
            openMaps('');
        }
    };

    const handleToggleComplete = () => {
        flushSave();
        router.patch(
            TaskController.update.url(task.id),
            { is_completed: !task.is_completed },
            { preserveScroll: true },
        );
    };

    const saveSchedule = useCallback(
        (date: string, time: string, duration: string) => {
            if (!date) return;
            const timeValue = time || '09:00';
            const currentTask = taskRef.current;
            const payload = {
                scheduled_at: `${date}T${timeValue}:00`,
                duration_minutes: parseInt(duration, 10),
            };

            if (currentTask.recurrence_series_id && !currentTask.is_recurrence_exception) {
                setPendingEditChange({ type: 'schedule', data: payload });
                return;
            }

            router.patch(
                TaskController.schedule.url(currentTask.id),
                payload,
                { preserveScroll: true },
            );
            if (currentTask.reminders.some((r) => r.notified_at)) {
                onScheduledWithNotifiedReminders(currentTask);
            }
        },
        [onScheduledWithNotifiedReminders],
    );

    const handleDateChange = (value: string) => {
        setScheduleDate(value);
        if (value) {
            saveSchedule(value, scheduleTime, durationMinutes);
        }
    };

    const handleTimeChange = (value: string) => {
        setScheduleTime(value);
        if (scheduleDate) {
            saveSchedule(scheduleDate, value, durationMinutes);
        }
    };

    const handleDurationChange = (value: string) => {
        setDurationMinutes(value);
        if (scheduleDate) {
            saveSchedule(scheduleDate, scheduleTime, value);
        }
    };

    const handleClearSchedule = () => {
        setScheduleDate('');
        setScheduleTime('');
        router.patch(TaskController.unschedule.url(task.id), {}, {
            preserveScroll: true,
        });
    };

    const handleDelete = () => {
        if (task.recurrence_series_id && !task.is_recurrence_exception) {
            setShowDeleteScopeDialog(true);
            return;
        }
        performDelete();
    };

    const performDelete = (scope?: RecurrenceScope) => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }
        pendingRef.current = null;
        router.delete(TaskController.destroy.url(task.id), {
            data: scope ? { recurrence_scope: scope } : {},
            preserveScroll: true,
        });
        setShowDeleteScopeDialog(false);
        onClose();
    };

    const handleEditScopeConfirm = (scope: RecurrenceScope) => {
        if (!pendingEditChange) return;
        const currentTask = taskRef.current;

        router.patch(
            TaskController.schedule.url(currentTask.id),
            { ...pendingEditChange.data, recurrence_scope: scope },
            { preserveScroll: true },
        );

        if (currentTask.reminders.some((r) => r.notified_at)) {
            onScheduledWithNotifiedReminders(currentTask);
        }

        setPendingEditChange(null);
    };

    const handleRecurrenceSave = (rule: RecurrenceRule) => {
        setShowRecurrencePicker(false);
        if (!task.scheduled_at) return;

        const parsed = parseScheduledAt(task.scheduled_at);
        router.post(RecurrenceSeriesController.store.url(), {
            existing_task_id: !task.recurrence_series_id ? task.id : undefined,
            title: task.title,
            description: task.description,
            start_date: parsed.date,
            time_of_day: parsed.time,
            duration_minutes: task.duration_minutes,
            location: task.location,
            location_coordinates: task.location_coordinates,
            tag_ids: task.tags.map((t) => t.id),
            reminders: task.reminders.map((r) => r.minutes_before),
            ...rule,
        }, { preserveScroll: true });
    };

    const handleRecurrenceRemove = () => {
        setShowRecurrencePicker(false);
        if (task.recurrence_series_id) {
            router.delete(TaskController.destroy.url(task.id), {
                data: { recurrence_scope: 'all' },
                preserveScroll: true,
            });
            onClose();
        }
    };

    const handleToggleRecurrencePicker = () => {
        if (showRecurrencePicker && recurrencePickerRef.current?.isDirty()) {
            setShowRecurrenceDirtyPrompt(true);
            return;
        }
        setShowRecurrenceDirtyPrompt(false);
        setShowRecurrencePicker(!showRecurrencePicker);
    };

    const handleRecurrenceDirtySave = () => {
        recurrencePickerRef.current?.save();
        setShowRecurrenceDirtyPrompt(false);
    };

    const handleRecurrenceDirtyDiscard = () => {
        setShowRecurrenceDirtyPrompt(false);
        setShowRecurrencePicker(false);
    };

    const handleToggleTag = useCallback(
        (tagId: number) => {
            const currentTask = taskRef.current;
            const previousTags = taskTagsRef.current;
            const currentIds = previousTags.map((tag) => tag.id);
            const newIds = currentIds.includes(tagId)
                ? currentIds.filter((id) => id !== tagId)
                : [...currentIds, tagId];
            const nextTags = tags.filter((tag) => newIds.includes(tag.id));

            taskTagsRef.current = nextTags;
            setTaskTags(nextTags);

            void requestJson<Tag[]>(
                'patch',
                TaskTagController.sync.url(currentTask.id),
                { tag_ids: newIds },
            )
                .then(() => {
                    router.reload();
                })
                .catch(() => {
                    taskTagsRef.current = previousTags;
                    setTaskTags(previousTags);
                });
        },
        [tags],
    );

    const handleCreateTag = useCallback(
        (name: string, color: string) => {
            const currentTask = taskRef.current;

            void (async () => {
                try {
                    const response = await requestJson<Tag>(
                        'post',
                        TagController.store.url(),
                        { name, color },
                    );
                    onTagCreated(response);
                    const previousTags = taskTagsRef.current;
                    const nextTags = [...previousTags, response];

                    taskTagsRef.current = nextTags;
                    setTaskTags(nextTags);

                    try {
                        await requestJson<Tag[]>(
                            'patch',
                            TaskTagController.sync.url(currentTask.id),
                            {
                                tag_ids: nextTags.map((tag) => tag.id),
                            },
                        );

                        setTagSearch('');
                        router.reload();
                    } catch {
                        taskTagsRef.current = previousTags;
                        setTaskTags(previousTags);
                    }
                } catch {
                    // Leave the current selection alone if tag creation fails.
                }
            })();
        },
        [onTagCreated],
    );

    const handleChangeTagColor = useCallback(
        (tagId: number, color: string) => {
            const previousTags = taskTagsRef.current;
            const nextTags = previousTags.map((tag) =>
                tag.id === tagId ? { ...tag, color } : tag,
            );

            taskTagsRef.current = nextTags;
            setTaskTags(nextTags);

            void requestJson<Tag>('patch', TagController.update.url(tagId), {
                color,
            })
                .then((response) => {
                    onTagUpdated(response);
                    router.reload();
                })
                .catch(() => {
                    taskTagsRef.current = previousTags;
                    setTaskTags(previousTags);
                });
        },
        [onTagUpdated],
    );

    const handleRemoveTag = useCallback((tagId: number) => {
        const currentTask = taskRef.current;
        const previousTags = taskTagsRef.current;
        const nextTags = previousTags.filter((tag) => tag.id !== tagId);

        taskTagsRef.current = nextTags;
        setTaskTags(nextTags);

        void requestJson<Tag[]>(
            'patch',
            TaskTagController.sync.url(currentTask.id),
            {
                tag_ids: nextTags.map((tag) => tag.id),
            },
        )
            .then(() => {
                router.reload();
            })
            .catch(() => {
                taskTagsRef.current = previousTags;
                setTaskTags(previousTags);
            });
    }, []);

    // Flush pending save and cleanup debounce on unmount
    useEffect(() => {
        return () => {
            flushSave();
        };
    }, [flushSave]);

    return (
        <div className="flex flex-col">
            {/* Title */}
            <div className="flex items-center gap-1 px-2 pt-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className={`size-7 shrink-0 ${task.is_completed ? 'text-primary' : 'text-muted-foreground'}`}
                    onClick={handleToggleComplete}
                >
                    {task.is_completed ? (
                        <Check className="size-4" />
                    ) : (
                        <Circle className="size-4" />
                    )}
                </Button>
                <Input
                    ref={titleRef}
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="flex-1 border-0 px-0 text-sm font-semibold shadow-none focus-visible:ring-0"
                    placeholder="Task title..."
                />
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:!text-destructive"
                    onClick={handleDelete}
                >
                    <Trash2 className="size-4" />
                </Button>
            </div>

            {/* Description */}
            <div className="px-3 pb-1">
                <textarea
                    value={description}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    placeholder="Add a description..."
                    rows={2}
                    className="w-full resize-none bg-transparent text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/50"
                />
            </div>

            {/* Location */}
            <div className="px-3 pb-1">
                <LocationInput
                    value={location}
                    coordinates={locationCoordinates}
                    onChange={handleLocationChange}
                    placeholder="Add a location..."
                />
            </div>

            {/* Tags */}
            {taskTags.length > 0 && (
                <div className="flex flex-wrap gap-1 px-3 pb-2">
                    {taskTags.map((tag) => (
                        <TagBadge
                            key={tag.id}
                            tag={tag}
                            size="sm"
                            onRemove={() => handleRemoveTag(tag.id)}
                            onColorChange={(color) =>
                                handleChangeTagColor(tag.id, color)
                            }
                        />
                    ))}
                </div>
            )}

            {/* Schedule */}
            <div className="flex flex-col gap-1.5 border-t border-border/50 px-3 py-2">
                <div className="flex items-center gap-1.5">
                    <Calendar className="size-3 shrink-0 text-muted-foreground" />
                    <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="h-7 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                    <Clock className="size-3 shrink-0 text-muted-foreground" />
                    <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => handleTimeChange(e.target.value)}
                        className="h-7 w-[5.5rem] rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                </div>
                <div className="flex items-center gap-1.5">
                    <Select
                        value={durationMinutes}
                        onValueChange={handleDurationChange}
                    >
                        <SelectTrigger size="sm" className="h-7 w-24 text-xs">
                            <SelectValue placeholder="Duration" />
                        </SelectTrigger>
                        <SelectContent>
                            {DURATION_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {task.scheduled_at && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                            onClick={handleClearSchedule}
                        >
                            <X className="size-3" />
                            Unschedule
                        </Button>
                    )}
                </div>
            </div>

            {/* Actions bar */}
            <div className="flex items-center gap-1 border-t border-border/50 px-2 py-1.5">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
                    onClick={() => setShowTagPicker(!showTagPicker)}
                >
                    <TagIcon className="size-3" />
                    Tags
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 gap-1.5 px-2 text-xs ${task.reminders.length > 0 ? 'text-primary' : 'text-muted-foreground'}`}
                    onClick={() => setShowReminderPicker(!showReminderPicker)}
                    disabled={!task.scheduled_at}
                    title={!task.scheduled_at ? 'Schedule the task first' : undefined}
                >
                    <Bell className="size-3" />
                    Remind
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 gap-1.5 px-2 text-xs ${task.recurrence_series ? 'text-primary' : 'text-muted-foreground'}`}
                    onClick={handleToggleRecurrencePicker}
                    disabled={!task.scheduled_at}
                    title={!task.scheduled_at ? 'Schedule the task first' : task.recurrence_series ? recurrenceLabel(task.recurrence_series) : undefined}
                >
                    <Repeat className="size-3" />
                    {task.recurrence_series ? recurrenceLabel(task.recurrence_series) : 'Repeat'}
                </Button>
                {locationCoordinates && task.scheduled_at && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
                        onClick={handleOpenDirections}
                    >
                        <Globe className="size-3" />
                        Directions
                    </Button>
                )}
            </div>

            {/* Inline tag picker */}
            {showTagPicker && (
                <div className="border-t border-border/50">
                    <div className="px-2 pt-1.5 pb-1">
                        <Input
                            value={tagSearch}
                            onChange={(e) => setTagSearch(e.target.value)}
                            placeholder="Search or create tag..."
                            className="h-7 border-0 px-1 text-xs shadow-none focus-visible:ring-0"
                        />
                    </div>
                    <TagPicker
                        tags={pickerTags}
                        selectedTagIds={taskTags.map((tag) => tag.id)}
                        onToggle={handleToggleTag}
                        onCreate={handleCreateTag}
                        onClose={() => setShowTagPicker(false)}
                        searchQuery={tagSearch}
                        inline
                    />
                </div>
            )}

            {/* Inline reminder picker */}
            {showReminderPicker && task.scheduled_at && (
                <div className="border-t border-border/50">
                    <ReminderPicker
                        taskId={task.id}
                        initialReminders={task.reminders.map(
                            (r) => r.minutes_before,
                        )}
                    />
                </div>
            )}

            {/* Inline recurrence picker */}
            {showRecurrencePicker && task.scheduled_at && (
                <div className="border-t border-border/50">
                    {showRecurrenceDirtyPrompt && (
                        <div className="flex items-center justify-between gap-2 bg-muted/50 px-3 py-1.5">
                            <span className="text-xs text-muted-foreground">Unsaved changes</span>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs text-muted-foreground"
                                    onClick={handleRecurrenceDirtyDiscard}
                                >
                                    Discard
                                </Button>
                                <Button
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={handleRecurrenceDirtySave}
                                >
                                    Save
                                </Button>
                            </div>
                        </div>
                    )}
                    <RecurrencePicker
                        ref={recurrencePickerRef}
                        key={task.recurrence_series?.id ?? 'new'}
                        initialRule={task.recurrence_series}
                        scheduledDate={scheduleDate}
                        onSave={handleRecurrenceSave}
                        onRemove={handleRecurrenceRemove}
                    />
                </div>
            )}

            {/* Edit scope dialog for recurring tasks */}
            <RecurrenceScopeDialog
                open={pendingEditChange !== null}
                action="edit"
                onConfirm={handleEditScopeConfirm}
                onCancel={() => setPendingEditChange(null)}
            />

            {/* Delete scope dialog for recurring tasks */}
            <RecurrenceScopeDialog
                open={showDeleteScopeDialog}
                action="delete"
                onConfirm={(scope) => performDelete(scope)}
                onCancel={() => setShowDeleteScopeDialog(false)}
            />
        </div>
    );
}
