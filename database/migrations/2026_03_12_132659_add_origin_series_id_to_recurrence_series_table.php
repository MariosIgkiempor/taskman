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
        Schema::table('recurrence_series', function (Blueprint $table) {
            $table->foreignId('origin_series_id')->nullable()->constrained('recurrence_series')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('recurrence_series', function (Blueprint $table) {
            $table->dropConstrainedForeignId('origin_series_id');
        });
    }
};
