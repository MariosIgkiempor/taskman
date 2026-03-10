export type Tag = {
    id: number;
    name: string;
    color: string;
};

export type TaskReminder = {
    id: number;
    task_id: number;
    minutes_before: number;
    notified_at: string | null;
};

export type Task = {
    id: number;
    title: string;
    description: string | null;
    scheduled_at: string | null;
    duration_minutes: number;
    is_completed: boolean;
    position: number;
    location: string | null;
    location_coordinates: { lat: number; lng: number } | null;
    tags: Tag[];
    reminders: TaskReminder[];
};

export type AppNotification = {
    id: string;
    type: string;
    data: {
        task_id: number;
        task_title: string;
        minutes_before: number;
        scheduled_at: string;
    };
    read_at: string | null;
    created_at: string;
};
