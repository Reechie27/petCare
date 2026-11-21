<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Pet extends Model
{
    use HasFactory;

    protected $table = 'pets';
    protected $primaryKey = 'pet_id';
    public $timestamps = true;

    protected $fillable = [
        'owner_id',
        'name',
        'species',
        'breed',
        'age',
        'weight',
        'color',
        'status',
        'food_allergies',
        'med_allergies',
    ];
}
