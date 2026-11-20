<?php
// Нужен только для встроенного сервера PHP (php -S ... router.php).
// Если запрошен настоящий файл из папки public (картинка, стиль, скрипт), отдаём его как есть,
// всё остальное отправляем в public/index.php.
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$publicDir = realpath(__DIR__ . '/public');
$file = realpath($publicDir . $path);
if ($file && str_starts_with($file, $publicDir . DIRECTORY_SEPARATOR) && is_file($file)) {
    return false;
}
require __DIR__ . '/public/index.php';
