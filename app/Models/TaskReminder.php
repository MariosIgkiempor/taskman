<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskReminder extends Model
{
    /** @use HasFactory<\Database\Factories\TaskReminderFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'task_id',
        'minutes_before',
        'notified_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'notified_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Task, $this>
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * @param  Builder<TaskReminder>  $query
     */
    public function scopeDue(Builder $query): void
    {
        $query->whereNull('notified_at')
            ->join('tasks', 'tasks.id', '=', 'task_reminders.task_id')
            ->whereNotNull('tasks.scheduled_at')
            ->where('tasks.is_completed', false)
            ->whereRaw("datetime(tasks.scheduled_at, '-' || task_reminders.minutes_before || ' minutes') <= ?", [now()->utc()->toDateTimeString()])
            ->select('task_reminders.*');
    }
}
