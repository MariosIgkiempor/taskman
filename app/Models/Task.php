<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class Task extends Model
{
    /** @use HasFactory<\Database\Factories\TaskFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'title',
        'description',
        'scheduled_at',
        'duration_minutes',
        'is_completed',
        'position',
        'location',
        'location_coordinates',
        'recurrence_series_id',
        'recurrence_index',
        'is_recurrence_exception',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'is_completed' => 'boolean',
            'is_recurrence_exception' => 'boolean',
            'location_coordinates' => 'array',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsToMany<Tag, $this>
     */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class);
    }

    /**
     * @return HasMany<TaskReminder, $this>
     */
    public function reminders(): HasMany
    {
        return $this->hasMany(TaskReminder::class);
    }

    /**
     * @return BelongsTo<RecurrenceSeries, $this>
     */
    public function recurrenceSeries(): BelongsTo
    {
        return $this->belongsTo(RecurrenceSeries::class);
    }

    public function isRecurring(): bool
    {
        return $this->recurrence_series_id !== null;
    }

    public function isRecurrenceException(): bool
    {
        return $this->is_recurrence_exception;
    }

    /**
     * @param  Builder<Task>  $query
     */
    public function scopeUnscheduled(Builder $query): void
    {
        $query->whereNull('scheduled_at');
    }

    /**
     * @param  Builder<Task>  $query
     */
    public function scopeScheduled(Builder $query): void
    {
        $query->whereNotNull('scheduled_at');
    }

    /**
     * @param  Builder<Task>  $query
     */
    public function scopeForWeek(Builder $query, Carbon $start): void
    {
        $query->whereBetween('scheduled_at', [$start->startOfWeek(), $start->copy()->endOfWeek()]);
    }
}
