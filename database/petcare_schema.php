<?php

$host = '127.0.0.1';
$rootUser = 'root';
$rootPassword = 'root123';
$dbUser = 'petcare';
$dbPassword = 'petcare123';
$dbName = 'petcare';
$charset = 'utf8mb4';

try {
    $rootPdo = new PDO("mysql:host={$host};charset={$charset}", $rootUser, $rootPassword, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $rootPdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $rootPdo->exec("CREATE USER IF NOT EXISTS '{$dbUser}'@'%' IDENTIFIED BY '{$dbPassword}'");
    $rootPdo->exec("GRANT ALL PRIVILEGES ON `{$dbName}`.* TO '{$dbUser}'@'%' WITH GRANT OPTION");
    $rootPdo->exec('FLUSH PRIVILEGES');

    $pdo = new PDO("mysql:host={$host};dbname={$dbName};charset={$charset}", $dbUser, $dbPassword, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $dropStatements = [
        'DROP TABLE IF EXISTS appointment_service',
        'DROP TABLE IF EXISTS appointments',
        'DROP TABLE IF EXISTS medical_record',
        'DROP TABLE IF EXISTS feeding',
        'DROP TABLE IF EXISTS grooming',
        'DROP TABLE IF EXISTS vaccination',
        'DROP TABLE IF EXISTS pets',
        'DROP TABLE IF EXISTS services',
        'DROP TABLE IF EXISTS veterinarians',
        'DROP TABLE IF EXISTS owners',
    ];

    foreach ($dropStatements as $sql) {
        $pdo->exec($sql);
    }

    $createStatements = [
        "CREATE TABLE owners (
            owner_id INT AUTO_INCREMENT PRIMARY KEY,
            first_name VARCHAR(80) NOT NULL,
            last_name VARCHAR(80) NOT NULL,
            phone VARCHAR(30) NOT NULL,
            email VARCHAR(150) NOT NULL UNIQUE,
            address VARCHAR(255) NOT NULL,
            registration_date DATE NOT NULL
        )",

        "CREATE TABLE pets (
            pet_id INT AUTO_INCREMENT PRIMARY KEY,
            owner_id INT NOT NULL,
            name VARCHAR(100) NOT NULL,
            species VARCHAR(50) NOT NULL,
            breed VARCHAR(100) DEFAULT NULL,
            age INT DEFAULT 0,
            weight DECIMAL(8,2) DEFAULT 0.00,
            color VARCHAR(80) DEFAULT NULL,
            status VARCHAR(50) DEFAULT 'Healthy',
            food_allergies TEXT DEFAULT NULL,
            med_allergies TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_pets_owner FOREIGN KEY (owner_id) REFERENCES owners(owner_id) ON DELETE CASCADE
        )",

        "CREATE TABLE veterinarians (
            veterinarian_id INT AUTO_INCREMENT PRIMARY KEY,
            first_name VARCHAR(80) NOT NULL,
            last_name VARCHAR(80) NOT NULL,
            phone VARCHAR(30) NOT NULL,
            email VARCHAR(150) NOT NULL UNIQUE,
            specialization VARCHAR(150) NOT NULL,
            license_no VARCHAR(80) NOT NULL UNIQUE
        )",

        "CREATE TABLE services (
            service_id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            duration INT NOT NULL DEFAULT 30,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",

        "CREATE TABLE medical_record (
            record_id INT AUTO_INCREMENT PRIMARY KEY,
            pet_id INT NOT NULL,
            veterinarian_id INT NOT NULL,
            diagnosis VARCHAR(255) NOT NULL,
            treatment TEXT,
            prescription TEXT,
            record_date DATE NOT NULL,
            notes TEXT,
            CONSTRAINT fk_medical_pet FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON DELETE CASCADE,
            CONSTRAINT fk_medical_vet FOREIGN KEY (veterinarian_id) REFERENCES veterinarians(veterinarian_id) ON DELETE RESTRICT
        )",

        "CREATE TABLE appointments (
            appointment_id INT AUTO_INCREMENT PRIMARY KEY,
            pet_id INT NOT NULL,
            veterinarian_id INT NULL,
            appointment_date DATE NOT NULL,
            appointment_time TIME NOT NULL,
            status VARCHAR(30) DEFAULT 'Pending',
            symptoms TEXT,
            notes TEXT,
            price DECIMAL(10,2) DEFAULT 0.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_appointments_pet FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON DELETE CASCADE,
            CONSTRAINT fk_appointments_vet FOREIGN KEY (veterinarian_id) REFERENCES veterinarians(veterinarian_id) ON DELETE SET NULL
        )",

        "CREATE TABLE appointment_service (
            appointment_service_id INT AUTO_INCREMENT PRIMARY KEY,
            appointment_id INT NOT NULL,
            service_id INT NOT NULL,
            quantity INT NOT NULL DEFAULT 1,
            unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            CONSTRAINT fk_appointment_service_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE,
            CONSTRAINT fk_appointment_service_service FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE RESTRICT
        )",

        "CREATE TABLE vaccination (
            vaccination_id INT AUTO_INCREMENT PRIMARY KEY,
            pet_id INT NOT NULL,
            vaccine_name VARCHAR(150) NOT NULL,
            date_given DATE NOT NULL,
            next_due_date DATE DEFAULT NULL,
            notes TEXT,
            CONSTRAINT fk_vaccination_pet FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON DELETE CASCADE
        )",

        "CREATE TABLE feeding (
            feeding_id INT AUTO_INCREMENT PRIMARY KEY,
            pet_id INT NOT NULL,
            food_type VARCHAR(100) NOT NULL,
            food_brand VARCHAR(150) DEFAULT NULL,
            quantity VARCHAR(50) NOT NULL,
            feeding_time TIME NOT NULL,
            notes TEXT,
            CONSTRAINT fk_feeding_pet FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON DELETE CASCADE
        )",

        "CREATE TABLE grooming (
            grooming_id INT AUTO_INCREMENT PRIMARY KEY,
            pet_id INT NOT NULL,
            grooming_type VARCHAR(150) NOT NULL,
            date DATE NOT NULL,
            groomer_name VARCHAR(120) DEFAULT NULL,
            notes TEXT,
            CONSTRAINT fk_grooming_pet FOREIGN KEY (pet_id) REFERENCES pets(pet_id) ON DELETE CASCADE
        )",
    ];

    foreach ($createStatements as $sql) {
        $pdo->exec($sql);
    }

    $seedStatements = [
        "INSERT INTO owners (first_name, last_name, phone, email, address, registration_date) VALUES
        ('John', 'Doe', '0917-123-4567', 'john.doe@gmail.com', '123 Mabini St, Manila', '2025-01-15'),
        ('Maria', 'Santos', '0920-987-6543', 'maria.s@yahoo.com', '45 Session Rd, Baguio', '2025-02-09'),
        ('Alex', 'Reyes', '0918-555-8899', 'alex.reyes@outlook.com', '78 Roxas Blvd, Pasay', '2025-04-18')",

        "INSERT INTO pets (owner_id, name, species, breed, age, weight, color, status, food_allergies, med_allergies) VALUES
        (1, 'Buddy', 'Dog', 'Golden Retriever', 3, 29.00, 'Golden', 'Healthy', 'Chicken', 'None'),
        (2, 'Luna', 'Cat', 'Siamese', 2, 4.00, 'Cream/Brown', 'Healthy', 'None', 'Penicillin'),
        (3, 'Coco', 'Bird', 'Cockatiel', 1, 0.10, 'Yellow/Grey', 'Under Treatment', 'None', 'None')",

        "INSERT INTO veterinarians (first_name, last_name, phone, email, specialization, license_no) VALUES
        ('Dr. Sarah', 'Gomez', '0919-444-1122', 'sarah.gomez@petcare.com', 'Small Animal Surgery', 'VET-98231'),
        ('Dr. Mark', 'Tan', '0917-333-7711', 'mark.tan@petcare.com', 'Feline Dermatology', 'VET-65412')",

        "INSERT INTO services (name, description, price, duration) VALUES
        ('General Checkup', 'Comprehensive health examination and consultation.', 500.00, 30),
        ('Rabies Vaccination', 'Standard anti-rabies booster immunization.', 350.00, 15),
        ('Full Grooming Session', 'Bath, coat trim, nail clip and ear cleansing.', 750.00, 60),
        ('Feeding & Nutrition Plan', 'Diet review and a feeding schedule made for your pet.', 300.00, 30),
        ('Pet Day Care', 'Supervised play, meals and rest while you are away.', 450.00, 240)",

        "INSERT INTO medical_record (pet_id, veterinarian_id, diagnosis, treatment, prescription, record_date, notes) VALUES
        (1, 1, 'Mild Ear Infection', 'Ear canal cleaning', 'Otoclean drops 2x daily', '2025-08-12', 'Re-evaluate in 2 weeks.')",

        "INSERT INTO appointments (pet_id, veterinarian_id, appointment_date, appointment_time, status, symptoms, notes, price) VALUES
        (1, 1, '2026-11-07', '10:00:00', 'Confirmed', 'Routine annual wellness check', 'Follow-up for healthy routine exam', 500.00),
        (2, 2, '2026-11-08', '14:00:00', 'Pending', 'Itching / scratching', 'Monitor skin sensitivity', 500.00),
        (3, 1, '2026-11-09', '09:00:00', 'Completed', 'Routine check', 'Bird under observation', 750.00)",

        "INSERT INTO appointment_service (appointment_id, service_id, quantity, unit_price, total_price) VALUES
        (1, 1, 1, 500.00, 500.00),
        (2, 1, 1, 500.00, 500.00),
        (3, 3, 1, 750.00, 750.00)",

        "INSERT INTO vaccination (pet_id, vaccine_name, date_given, next_due_date, notes) VALUES
        (1, 'DHPP Vaccine', '2025-10-01', '2026-11-30', 'Annual booster complete.'),
        (2, 'Rabies Booster', '2025-07-05', '2026-10-20', 'No immediate side effects.')",

        "INSERT INTO feeding (pet_id, food_type, food_brand, quantity, feeding_time, notes) VALUES
        (1, 'Dry Kibble', 'Royal Canin Adult', '2 cups', '08:00:00', 'Mix with warm water.'),
        (2, 'Wet Food', 'Whiskas Salmon', '1 pouch', '18:00:00', 'Likes extra broth.')",

        "INSERT INTO grooming (pet_id, grooming_type, date, groomer_name, notes) VALUES
        (1, 'Full Bath & Haircut', '2026-10-05', 'Leo Ramos', 'Very cooperative.')"
    ];

    foreach ($seedStatements as $sql) {
        $pdo->exec($sql);
    }

    echo "PetCare database created successfully in MySQL.\n";
} catch (Throwable $e) {
    echo 'Database setup failed: ' . $e->getMessage() . PHP_EOL;
    exit(1);
}
