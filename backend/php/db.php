<?php

function loadEnv(string $path): void {
    if (!is_file($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (trim($line) === '' || str_starts_with(trim($line), '#')) {
            continue;
        }

        [$key, $value] = array_pad(explode('=', $line, 2), 2, '');
        $key = trim($key);
        $value = trim($value);

        if ($key !== '') {
            putenv("{$key}={$value}");
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }
}

loadEnv(__DIR__ . '/../.env');

function env(string $key, mixed $default = null): mixed {
    $value = getenv($key);
    if ($value === false || $value === '') {
        return $default;
    }

    return $value;
}

function getDatabaseConnection(): PDO {
    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=%s',
        env('DB_HOST', '127.0.0.1'),
        env('DB_PORT', '3306'),
        env('DB_DATABASE', 'petcare'),
        env('DB_CHARSET', 'utf8mb4')
    );

    return new PDO(
        $dsn,
        env('DB_USERNAME', 'petcare'),
        env('DB_PASSWORD', 'petcare123'),
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
}
