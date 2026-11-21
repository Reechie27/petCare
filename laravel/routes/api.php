<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PetController;

Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'service' => 'PetCare Laravel API']);
});

Route::get('/pets', [PetController::class, 'index']);
Route::post('/pets', [PetController::class, 'store']);
Route::get('/pets/{id}', [PetController::class, 'show']);
Route::put('/pets/{id}', [PetController::class, 'update']);
Route::delete('/pets/{id}', [PetController::class, 'destroy']);

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});
