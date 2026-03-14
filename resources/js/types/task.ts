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

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export type RecurrenceSeries = {
  id: number;
  frequency: RecurrenceFrequency;
  interval: number;
  days_of_week: number[] | null;
  month_day: number | null;
  month_week_ordinal: number | null;
  month_week_day: number | null;
  end_date: string | null;
  end_count: number | null;
};

export type RecurrenceScope = "single" | "following" | "all";

export type Task = {
  id: number;
  board_id: number;
  title: string;
  description: string | null;
  scheduled_at: string | null;
  duration_minutes: number;
  is_completed: boolean;
  position: number;
  location: string | null;
  location_coordinates: { lat: number; lng: number } | null;
  recurrence_series_id: number | null;
  recurrence_index: number | null;
  is_recurrence_exception: boolean;
  recurrence_series: RecurrenceSeries | null;
  tags: Tag[];
  reminders: TaskReminder[];
};

export type DashboardTask = {
  id: number;
  title: string;
  scheduled_at: string | null;
  is_completed: boolean;
  duration_minutes: number;
  tags: Tag[];
  board: {
    id: number;
    name: string;
    color: string | null;
    workspace: {
      id: number;
      name: string;
      is_personal: boolean;
    };
  };
};

export type WorkspaceBreakdown = {
  id: number;
  name: string;
  is_personal: boolean;
  total_tasks: number;
  completed_tasks: number;
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
