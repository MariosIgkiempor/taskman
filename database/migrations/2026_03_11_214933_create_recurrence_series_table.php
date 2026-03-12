<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('recurrence_series', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('board_id')->constrained()->cascadeOnDelete();

            // Template fields (copied to each generated task)
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->time('time_of_day');
            $table->unsignedSmallInteger('duration_minutes')->default(60);
            $table->string('location', 500)->nullable();
            $table->json('location_coordinates')->nullable();

            // Recurrence rule
            $table->string('frequency'); // daily, weekly, monthly, yearly
            $table->unsignedSmallInteger('interval')->default(1);
            $table->json('days_of_week')->nullable(); // ISO weekday numbers [1..7]
            $table->unsignedSmallInteger('month_day')->nullable();
            $table->unsignedSmallInteger('month_week_ordinal')->nullable();
            $table->unsignedSmallInteger('month_week_day')->nullable();

            // End conditions
            $table->date('end_date')->nullable();
            $table->unsignedInteger('end_count')->nullable();

            // Bookkeeping
            $table->date('start_date');
            $table->date('generated_until');
            $table->unsignedInteger('next_index')->default(0);

            $table->timestamps();

            $table->index('user_id');
            $table->index('generated_until');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('recurrence_series');
    }
};
