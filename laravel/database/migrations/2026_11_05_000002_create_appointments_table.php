<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id('appointment_id');
            $table->unsignedBigInteger('pet_id');
            $table->unsignedBigInteger('service_id');
            $table->unsignedBigInteger('veterinarian_id')->nullable();
            $table->date('appointment_date');
            $table->time('appointment_time');
            $table->string('status', 30)->default('Pending');
            $table->text('symptoms')->nullable();
            $table->text('notes')->nullable();
            $table->decimal('price', 10, 2)->default(0.00);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
