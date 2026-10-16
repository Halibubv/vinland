<?php
declare(strict_types=1);
// Router for PHP's local development server. Only /public can be served as files.
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$public = realpath(__DIR__ . '/public');
$file = realpath($public . $path);
if ($file && str_starts_with($file, $public . DIRECTORY_SEPARATOR) && is_file($file)) {
    return false;
}
require __DIR__ . '/public/index.php';
