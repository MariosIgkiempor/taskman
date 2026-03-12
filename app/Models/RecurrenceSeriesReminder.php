<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecurrenceSeriesReminder extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'recurrence_series_id',
        'minutes_before',
    ];

    /**
     * @return BelongsTo<RecurrenceSeries, $this>
     */
    public function series(): BelongsTo
    {
        return $this->belongsTo(RecurrenceSeries::class, 'recurrence_series_id');
    }
}
