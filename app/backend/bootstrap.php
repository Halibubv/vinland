<?php
// Общая подготовка каждого запроса: подключает все модули, настраивает сессию,
// заголовки безопасности и единый обработчик ошибок.
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

const SESSION_IDLE_SECONDS = 30 * 60;
const SESSION_MAX_SECONDS = 24 * 60 * 60;

ini_set('display_errors', '0');
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
// По умолчанию PHP может удалить файл сессии уже через 24 минуты простоя,
// раньше обещанных 30 минут. Храним его не меньше срока простоя.
ini_set('session.gc_maxlifetime', (string) SESSION_IDLE_SECONDS);
date_default_timezone_set('Europe/Moscow');

// Флаг secure говорит браузеру отправлять cookie только по HTTPS.
// На Render HTTPS обрабатывает их прокси, браузер видит https://, поэтому флаг работает.
// Локально без HTTPS в .env ставится SESSION_SECURE=0.
session_name('vinland_session');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'httponly' => true,
    'samesite' => 'Lax',
    'secure' => config('SESSION_SECURE', '1') === '1',
]);
session_start();

// Вход сбрасывается после 30 минут без запросов или через 24 часа после входа.
if (isset($_SESSION['user_id'])) {
    $idleSeconds = time() - ($_SESSION['last_seen'] ?? 0);
    $signedInSeconds = time() - ($_SESSION['signed_in'] ?? 0);
    if ($idleSeconds > SESSION_IDLE_SECONDS || $signedInSeconds > SESSION_MAX_SECONDS) {
        $_SESSION = [];
        session_regenerate_id(true);
    }
}
$_SESSION['last_seen'] = time();
if (!isset($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
}

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('X-Frame-Options: DENY');

function handle_uncaught_error(Throwable $error): never
{
    if ($error instanceof ApiError) {
        respond(['error' => $error->getMessage(), 'fields' => $error->fields], $error->status);
    }
    // Подробности ошибки пишем в журнал сервера, в браузер уходит только общий текст.
    error_log((string) $error);
    respond(['error' => 'Не удалось выполнить действие. Повторите попытку позже.'], 500);
}
set_exception_handler('handle_uncaught_error');
