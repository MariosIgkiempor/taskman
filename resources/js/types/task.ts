export type Task = {
    id: number;
    title: string;
    description: string | null;
    scheduled_at: string | null;
    is_completed: boolean;
    position: number;
};
