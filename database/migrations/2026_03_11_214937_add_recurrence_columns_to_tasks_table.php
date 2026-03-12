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
        Schema::table('tasks', function (Blueprint $table) {
            $table->foreignId('recurrence_series_id')->nullable()->constrained('recurrence_series')->nullOnDelete();
            $table->unsignedInteger('recurrence_index')->nullable();
            $table->boolean('is_recurrence_exception')->default(false);

            $table->index('recurrence_series_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropConstrainedForeignId('recurrence_series_id');
            $table->dropColumn(['recurrence_index', 'is_recurrence_exception']);
        });
    }
};
