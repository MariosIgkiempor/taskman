<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RecurrenceSeries extends Model
{
    /** @use HasFactory<\Database\Factories\RecurrenceSeriesFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'title',
        'description',
        'time_of_day',
        'duration_minutes',
        'location',
        'location_coordinates',
        'frequency',
        'interval',
        'days_of_week',
        'month_day',
        'month_week_ordinal',
        'month_week_day',
        'end_date',
        'end_count',
        'start_date',
        'generated_until',
        'next_index',
        'origin_series_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'days_of_week' => 'array',
            'location_coordinates' => 'array',
            'start_date' => 'date',
            'end_date' => 'date',
            'generated_until' => 'date',
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
     * @return HasMany<Task, $this>
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    /**
     * @return BelongsToMany<Tag, $this>
     */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'recurrence_series_tag');
    }

    /**
     * @return BelongsTo<self, $this>
     */
    public function originSeries(): BelongsTo
    {
        return $this->belongsTo(self::class, 'origin_series_id');
    }

    /**
     * @return HasMany<self, $this>
     */
    public function derivedSeries(): HasMany
    {
        return $this->hasMany(self::class, 'origin_series_id');
    }

    /**
     * @return HasMany<RecurrenceSeriesReminder, $this>
     */
    public function reminders(): HasMany
    {
        return $this->hasMany(RecurrenceSeriesReminder::class);
    }
}
