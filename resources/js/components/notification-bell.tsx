import { router, usePage } from '@inertiajs/react';
import { Bell, CheckCheck } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import NotificationController from '@/actions/App/Http/Controllers/NotificationController';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { requestJson } from '@/lib/request-json';
import type { AppNotification } from '@/types';

function formatTimeAgo(dateString: string): string {
    const seconds = Math.floor(
        (Date.now() - new Date(dateString).getTime()) / 1000,
    );
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function formatReminderLabel(minutesBefore: number): string {
    if (minutesBefore >= 60) {
        return `${minutesBefore / 60} hour before`;
    }
    return `${minutesBefore} min before`;
}

export function NotificationBell() {
    const { unreadNotificationsCount } = usePage().props;
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchNotifications = useCallback(() => {
        setLoading(true);
        void requestJson<{ notifications: AppNotification[] }>(
            'get',
            NotificationController.index.url(),
        )
            .then((res) => setNotifications(res.notifications))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        intervalRef.current = setInterval(() => {
            router.reload({ only: ['unreadNotificationsCount'] });
        }, 30000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (open) fetchNotifications();
    }, [open, fetchNotifications]);

    const handleMarkAsRead = useCallback(
        (id: string) => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
            void requestJson(
                'patch',
                NotificationController.markAsRead.url(id),
            ).then(() => {
                router.reload({ only: ['unreadNotificationsCount'] });
            });
        },
        [],
    );

    const handleMarkAllAsRead = useCallback(() => {
        setNotifications([]);
        void requestJson(
            'post',
            NotificationController.markAllAsRead.url(),
        ).then(() => {
            router.reload({ only: ['unreadNotificationsCount'] });
        });
    }, []);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-8 w-8"
                >
                    <Bell className="size-4" />
                    {unreadNotificationsCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                            {unreadNotificationsCount > 9
                                ? '9+'
                                : unreadNotificationsCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="w-80 p-0"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
                    <span className="text-sm font-medium">Notifications</span>
                    {notifications.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1 px-1.5 text-xs text-muted-foreground"
                            onClick={handleMarkAllAsRead}
                        >
                            <CheckCheck className="size-3" />
                            Mark all read
                        </Button>
                    )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                    {loading && notifications.length === 0 && (
                        <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                            Loading...
                        </div>
                    )}
                    {!loading && notifications.length === 0 && (
                        <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                            No new notifications
                        </div>
                    )}
                    {notifications.map((notification) => (
                        <button
                            key={notification.id}
                            type="button"
                            className="flex w-full items-start gap-2 border-b border-border/30 px-3 py-2 text-left transition-colors last:border-0 hover:bg-accent"
                            onClick={() => handleMarkAsRead(notification.id)}
                        >
                            <Bell className="mt-0.5 size-3.5 shrink-0 text-primary" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium">
                                    {notification.data.task_title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {formatReminderLabel(
                                        notification.data.minutes_before,
                                    )}
                                </p>
                            </div>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                                {formatTimeAgo(notification.created_at)}
                            </span>
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
