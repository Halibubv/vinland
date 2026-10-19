<?php
// Для HTTP-тестов: создаёт администратора со случайным email и печатает этот email.
declare(strict_types=1);
require dirname(__DIR__) . '/backend/config.php';
require dirname(__DIR__) . '/backend/database.php';

$email = 'http-admin-' . bin2hex(random_bytes(6)) . '@example.test';
query('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)', [
    $email, password_hash('CorrectHorse42', PASSWORD_DEFAULT), 'Тестовый администратор', 'admin',
]);
echo $email . "\n";
