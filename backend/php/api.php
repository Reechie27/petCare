<?php

require __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    $input = [];
}

try {
    $pdo = getDatabaseConnection();

    if ($uri === '/api/health') {
        echo json_encode(['status' => 'ok', 'database' => env('DB_DATABASE', 'petcare')]);
        exit;
    }

    if ($uri === '/api/pets' && $method === 'GET') {
        $stmt = $pdo->query('SELECT * FROM pets ORDER BY pet_id DESC');
        echo json_encode($stmt->fetchAll());
        exit;
    }

    if ($uri === '/api/pets' && $method === 'POST') {
        $name = trim((string)($input['name'] ?? ''));
        $ownerId = (int)($input['owner_id'] ?? 0);
        $species = trim((string)($input['species'] ?? ''));
        $breed = trim((string)($input['breed'] ?? ''));

        if ($name === '' || $ownerId <= 0 || $species === '') {
            http_response_code(422);
            echo json_encode(['error' => 'name, owner_id, and species are required.']);
            exit;
        }

        $stmt = $pdo->prepare(
            'INSERT INTO pets (owner_id, name, species, breed, age, weight, color, status, food_allergies, med_allergies) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );

        $stmt->execute([
            $ownerId,
            $name,
            $species,
            $breed,
            (int)($input['age'] ?? 0),
            (float)($input['weight'] ?? 0),
            $input['color'] ?? null,
            $input['status'] ?? 'Healthy',
            $input['food_allergies'] ?? 'None',
            $input['med_allergies'] ?? 'None',
        ]);

        $petId = (int)$pdo->lastInsertId();
        echo json_encode(['message' => 'Pet created', 'pet_id' => $petId]);
        exit;
    }

    if ($uri === '/api/appointments' && $method === 'GET') {
        $stmt = $pdo->query('SELECT * FROM appointments ORDER BY appointment_date DESC, appointment_time DESC');
        echo json_encode($stmt->fetchAll());
        exit;
    }

    if ($uri === '/api/appointments' && $method === 'POST') {
        $petId = (int)($input['pet_id'] ?? 0);
        $serviceId = (int)($input['service_id'] ?? 0);
        $appointmentDate = trim((string)($input['appointment_date'] ?? ''));
        $appointmentTime = trim((string)($input['appointment_time'] ?? ''));

        if ($petId <= 0 || $serviceId <= 0 || $appointmentDate === '' || $appointmentTime === '') {
            http_response_code(422);
            echo json_encode(['error' => 'pet_id, service_id, appointment_date, and appointment_time are required.']);
            exit;
        }

        $stmt = $pdo->prepare(
            'INSERT INTO appointments (pet_id, service_id, veterinarian_id, appointment_date, appointment_time, status, symptoms, notes, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );

        $stmt->execute([
            $petId,
            $serviceId,
            (int)($input['veterinarian_id'] ?? 0),
            $appointmentDate,
            $appointmentTime,
            $input['status'] ?? 'Pending',
            $input['symptoms'] ?? 'Routine check',
            $input['notes'] ?? '',
            (float)($input['price'] ?? 0),
        ]);

        echo json_encode(['message' => 'Appointment created']);
        exit;
    }

    http_response_code(404);
    echo json_encode(['error' => 'Route not found']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Database error',
        'message' => $e->getMessage(),
    ]);
}
