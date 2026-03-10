<?php

namespace App\Console\Commands;

use App\Models\TaskReminder;
use App\Notifications\TaskReminderNotification;
use Illuminate\Console\Command;

class SendTaskReminders extends Command
{
    protected $signature = 'reminders:send';

    protected $description = 'Send due task reminder notifications';

    public function handle(): void
    {
        $reminders = TaskReminder::query()
            ->due()
            ->with('task.user')
            ->get();

        foreach ($reminders as $reminder) {
            $reminder->task->user->notify(
                new TaskReminderNotification($reminder->task, $reminder->minutes_before)
            );

            $reminder->update(['notified_at' => now()]);
        }

        $this->info("Sent {$reminders->count()} reminder(s).");
    }
}
