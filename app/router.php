<?php
// Маршрутизатор для встроенного сервера PHP (php -S): существующие файлы из public/
// отдаются как есть, всё остальное уходит в public/index.php. Файлы вне public/ недоступны.
declare(strict_types=1);
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$publicDir = realpath(__DIR__ . '/public');
$file = realpath($publicDir . $path);
if ($file && str_starts_with($file, $publicDir . DIRECTORY_SEPARATOR) && is_file($file)) {
    return false;
}
require __DIR__ . '/public/index.php';
