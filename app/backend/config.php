<?php
declare(strict_types=1);

// Local configuration never belongs in Git. Environment variables take priority.
$local = is_file(dirname(__DIR__) . '/.env')
    ? parse_ini_file(dirname(__DIR__) . '/.env', false, INI_SCANNER_RAW) : [];
if ($local === false) {
    throw new RuntimeException('Invalid local configuration');
}
function config(string $name, string $default = ''): string
{
    global $local;
    $value = getenv($name);
    return $value === false ? (string) ($local[$name] ?? $default) : $value;
}
