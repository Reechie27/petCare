<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pets', function (Blueprint $table) {
            $table->id('pet_id');
            $table->unsignedBigInteger('owner_id');
            $table->string('name', 100);
            $table->string('species', 50);
            $table->string('breed', 100)->nullable();
            $table->integer('age')->default(0);
            $table->decimal('weight', 8, 2)->default(0.00);
            $table->string('color', 80)->nullable();
            $table->string('status', 50)->default('Healthy');
            $table->text('food_allergies')->nullable();
            $table->text('med_allergies')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pets');
    }
};
