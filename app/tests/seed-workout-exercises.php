<?php
// Для HTTP-тестов: создаёт два упражнения и печатает их id через запятую.
declare(strict_types=1);
require dirname(__DIR__) . '/backend/config.php';
require dirname(__DIR__) . '/backend/database.php';

$suffix = bin2hex(random_bytes(6));
$first = query('INSERT INTO exercises (name, muscle_group) VALUES (?, ?) RETURNING id', [
    'Тестовая тяга ' . $suffix, 'Спина',
])->fetchColumn();
$second = query('INSERT INTO exercises (name, muscle_group) VALUES (?, ?) RETURNING id', [
    'Тестовый жим ' . $suffix, 'Грудь',
])->fetchColumn();
echo $first . ',' . $second;
