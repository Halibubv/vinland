<?php
// Для HTTP-тестов: создаёт два упражнения и печатает их id через запятую.
declare(strict_types=1);
require dirname(__DIR__) . '/backend/config.php';
require dirname(__DIR__) . '/backend/database.php';

$suffix = bin2hex(random_bytes(6));
$first = insert('INSERT INTO exercises (name, muscle_group) VALUES (?, ?)', [
    'Тестовая тяга ' . $suffix, 'Спина',
]);
$second = insert('INSERT INTO exercises (name, muscle_group) VALUES (?, ?)', [
    'Тестовый жим ' . $suffix, 'Грудь',
]);
echo $first . ',' . $second;
