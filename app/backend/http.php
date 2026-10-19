<?php
// Ответы в JSON, чтение JSON из запроса и проверка CSRF-токена.
declare(strict_types=1);

// Ошибка, которую можно показать пользователю: код ответа, текст и ошибки по полям формы.
final class ApiError extends RuntimeException
{
    public function __construct(public int $status, string $message, public array $fields = [])
    {
        parent::__construct($message);
    }
}

const MAX_REQUEST_BYTES = 1024 * 1024;

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
    $contentType = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
    if (!str_starts_with($contentType, 'application/json')) {
        throw new ApiError(415, 'Отправьте данные в формате JSON.');
    }
    // Читаем на один байт больше лимита, чтобы понять, что тело слишком большое.
    $stream = fopen('php://input', 'rb');
    $body = stream_get_contents($stream, MAX_REQUEST_BYTES + 1);
    fclose($stream);
    if (strlen($body) > MAX_REQUEST_BYTES) {
        throw new ApiError(413, 'Слишком большой запрос.');
    }
    try {
        $data = json_decode($body, true, 64, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw new ApiError(400, 'Некорректный JSON.');
    }
    // Нужен именно объект {...}, в том числе пустой, а не JSON-массив [...].
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
