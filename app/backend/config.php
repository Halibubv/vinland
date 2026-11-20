<?php
// Настройки приложения: адрес базы данных, пароль и т. д.
// Сначала смотрим переменные окружения (так настройки задаются на хостинге Render),
// потом файл app/.env (так удобно на своём компьютере). Файл .env в Git не попадает.

function config($name, $default = '')
{
    $value = getenv($name);
    if ($value !== false) {
        return $value;
    }

    $file = __DIR__ . '/../.env';
    if (is_file($file)) {
        $settings = parse_ini_file($file, false, INI_SCANNER_RAW);
        if (isset($settings[$name])) {
            return $settings[$name];
        }
    }

    return $default;
}
