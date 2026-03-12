<?php

namespace App\Console\Commands;

use App\Services\RecurrenceService;
use Illuminate\Console\Command;

class ExtendRecurrenceSeries extends Command
{
    /**
     * @var string
     */
    protected $signature = 'recurrence:extend {--weeks=12 : Number of weeks ahead to generate instances}';

    /**
     * @var string
     */
    protected $description = 'Generate task instances for recurring series that need extension';

    public function handle(RecurrenceService $service): void
    {
        $count = $service->extendAllSeries((int) $this->option('weeks'));
        $this->info("Generated {$count} new task instance(s).");
    }
}
