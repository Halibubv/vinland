<?php
// Настройки приложения: сначала переменные окружения, потом файл .env.
// Файл .env хранится только локально и в Git не попадает.
declare(strict_types=1);

function config(string $name, string $default = ''): string
{
    $fromEnvironment = getenv($name);
    if ($fromEnvironment !== false) {
        return $fromEnvironment;
    }
    $localSettings = local_settings();
    if (isset($localSettings[$name])) {
        return (string) $localSettings[$name];
    }
    return $default;
}

// Читаем .env один раз за запрос и запоминаем результат.
function local_settings(): array
{
    static $settings = null;
    if ($settings !== null) {
        return $settings;
    }
    $file = dirname(__DIR__) . '/.env';
    if (!is_file($file)) {
        $settings = [];
        return $settings;
    }
    $parsed = parse_ini_file($file, false, INI_SCANNER_RAW);
    if ($parsed === false) {
        throw new RuntimeException('Invalid local configuration');
    }
    $settings = $parsed;
    return $settings;
}
