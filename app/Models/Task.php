<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
        'is_completed',
        'position',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'is_completed' => 'boolean',
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
