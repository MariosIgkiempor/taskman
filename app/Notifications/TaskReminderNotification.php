<?php

namespace App\Notifications;

use App\Models\Task;
use Illuminate\Notifications\Notification;

class TaskReminderNotification extends Notification
{
    public function __construct(
        public Task $task,
        public int $minutesBefore,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'task_id' => $this->task->id,
            'task_title' => $this->task->title,
            'minutes_before' => $this->minutesBefore,
            'scheduled_at' => $this->task->scheduled_at->toISOString(),
        ];
    }
}
