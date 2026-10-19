<?php
declare(strict_types=1);

final class ApiError extends RuntimeException
{
    public function __construct(public int $status, string $message, public array $fields = [])
    {
        parent::__construct($message);
    }
}

function respond(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

function read_json(): array
{
    if (!str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) {
        throw new ApiError(415, 'Отправьте данные в формате JSON.');
    }
    $stream = fopen('php://input', 'rb');
    $body = stream_get_contents($stream, 1024 * 1024 + 1);
    fclose($stream);
    if (strlen($body) > 1024 * 1024) {
        throw new ApiError(413, 'Слишком большой запрос.');
    }
    try {
        $data = json_decode($body, true, 64, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw new ApiError(400, 'Некорректный JSON.');
    }
    // Require an object, including the empty object, rather than a JSON array.
    if (!is_array($data) || !str_starts_with(ltrim($body), '{')) {
        throw new ApiError(400, 'Ожидается объект с полями формы.');
    }
    return $data;
}

function require_csrf(): void
{
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($token) || !hash_equals($_SESSION['csrf'], $token)) {
        throw new ApiError(403, 'Обновите страницу и повторите действие.');
    }
}
