<?php
declare(strict_types=1);
require dirname(__DIR__) . '/backend/config.php';
require dirname(__DIR__) . '/backend/database.php';

$name = 'HTTP-тест питания ' . bin2hex(random_bytes(6));
$id = query('INSERT INTO products (name, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g)
    VALUES (?, 200, 10, 5, 20) RETURNING id', [$name])->fetchColumn();
echo $id . "\n";
