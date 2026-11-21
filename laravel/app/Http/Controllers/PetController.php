<?php

namespace App\Http\Controllers;

use App\Models\Pet;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PetController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Pet::orderBy('pet_id', 'desc')->get());
    }

    public function show(int $id): JsonResponse
    {
        $pet = Pet::findOrFail($id);
        return response()->json($pet);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'owner_id' => ['required', 'integer'],
            'name' => ['required', 'string', 'max:100'],
            'species' => ['required', 'string', 'max:50'],
            'breed' => ['nullable', 'string', 'max:100'],
            'age' => ['nullable', 'integer'],
            'weight' => ['nullable', 'numeric'],
            'color' => ['nullable', 'string', 'max:80'],
            'status' => ['nullable', 'string', 'max:50'],
            'food_allergies' => ['nullable', 'string'],
            'med_allergies' => ['nullable', 'string'],
        ]);

        $pet = Pet::create($validated);

        return response()->json([
            'message' => 'Pet created successfully.',
            'pet' => $pet,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $pet = Pet::findOrFail($id);
        $pet->fill($request->all());
        $pet->save();

        return response()->json([
            'message' => 'Pet updated successfully.',
            'pet' => $pet,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $pet = Pet::findOrFail($id);
        $pet->delete();

        return response()->json(['message' => 'Pet deleted successfully.']);
    }
}
