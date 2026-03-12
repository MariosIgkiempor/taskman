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
        Schema::create('recurrence_series_reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('recurrence_series_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('minutes_before');
            $table->timestamps();

            $table->unique(['recurrence_series_id', 'minutes_before']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('recurrence_series_reminders');
    }
};
