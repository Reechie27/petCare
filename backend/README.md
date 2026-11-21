# PetCare PHP backend

This directory adds a lightweight PHP API connected to the same MySQL database used by the Laravel app.

## 1) Start MySQL

The project expects a database named `petcare`.

```bash
cd c:/PETCARE
docker compose up -d db
```

If you are not using Docker, create a MySQL database manually with:

```sql
CREATE DATABASE petcare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'petcare'@'localhost' IDENTIFIED BY 'petcare123';
GRANT ALL PRIVILEGES ON petcare.* TO 'petcare'@'localhost';
FLUSH PRIVILEGES;
```

## 2) Configure environment

Copy the example file and update values if needed.

```bash
cp backend/.env.example backend/.env
```

## 3) Run the PHP API

```bash
php -S 127.0.0.1:8000 -t backend/php
```

Then call:

- `GET http://127.0.0.1:8000/api/health`
- `GET http://127.0.0.1:8000/api/pets`
- `POST http://127.0.0.1:8000/api/pets`
- `GET http://127.0.0.1:8000/api/appointments`

## 4) Laravel integration

The Laravel project in the `laravel/` directory is configured to use the same database settings and is intended to run from the same MySQL instance.

## Database schema

The project expects tables such as `pets` and `appointments`.

```sql
CREATE TABLE pets (
    pet_id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    species VARCHAR(50) NOT NULL,
    breed VARCHAR(100) DEFAULT NULL,
    age INT DEFAULT 0,
    weight DECIMAL(8,2) DEFAULT 0,
    color VARCHAR(80) DEFAULT NULL,
    status VARCHAR(50) DEFAULT 'Healthy',
    food_allergies TEXT DEFAULT NULL,
    med_allergies TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE appointments (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    pet_id INT NOT NULL,
    service_id INT NOT NULL,
    veterinarian_id INT DEFAULT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status VARCHAR(30) DEFAULT 'Pending',
    symptoms TEXT DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    price DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```
