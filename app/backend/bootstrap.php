<?php
declare(strict_types=1);
require __DIR__ . '/config.php';
require __DIR__ . '/http.php';
require __DIR__ . '/database.php';
require __DIR__ . '/validation.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/workouts.php';
require __DIR__ . '/meals.php';
require __DIR__ . '/admin.php';
require __DIR__ . '/statistics.php';

ini_set('display_errors', '0');
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
date_default_timezone_set('Europe/Moscow');
session_name('vinland_session');
session_set_cookie_params([
    'lifetime' => 0, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax',
    'secure' => config('SESSION_SECURE', '1') === '1',
]);
session_start();

// Expire authenticated sessions after 30 minutes without requests, or 24 hours overall.
if (isset($_SESSION['user_id']) &&
    (time() - ($_SESSION['last_seen'] ?? 0) > 1800 || time() - ($_SESSION['signed_in'] ?? 0) > 86400)) {
    $_SESSION = [];
    session_regenerate_id(true);
}
$_SESSION['last_seen'] = time();
$_SESSION['csrf'] ??= bin2hex(random_bytes(32));

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('X-Frame-Options: DENY');
set_exception_handler(function (Throwable $error): never {
    if ($error instanceof ApiError) {
        respond(['error' => $error->getMessage(), 'fields' => $error->fields], $error->status);
    }
    // Detailed diagnostics stay on the server, never in the browser response.
    error_log((string) $error);
    respond(['error' => 'Не удалось выполнить действие. Повторите попытку позже.'], 500);
});
