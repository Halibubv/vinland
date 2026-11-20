<?php
// Ответы сервера браузеру и чтение данных, которые прислал браузер.
// Браузер и сервер общаются в формате JSON: {"name": "Алексей", "target_calories": 2400}.

// Отправить ответ в формате JSON и закончить работу скрипта (exit).
function respond($data, $status = 200)
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Отправить ошибку. $status — код ответа: 401 не вошёл, 403 нет прав, 404 не найдено,
// 422 ошибка в форме. $fields — тексты ошибок для полей формы: ['email' => 'Введите email.'].
function send_error($status, $message, $fields = [])
{
    respond(['error' => $message, 'fields' => $fields], $status);
}

// Данные из тела запроса (то, что React отправил в body) в виде массива PHP.
function read_json()
{
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (!str_starts_with($contentType, 'application/json')) {
        send_error(415, 'Отправьте данные в формате JSON.');
    }

    $body = file_get_contents('php://input');
    if (strlen($body) > 1024 * 1024) {
        send_error(413, 'Слишком большой запрос.');
    }

    // true — получить обычный массив, а не объект.
    $data = json_decode($body, true);
    if (!is_array($data)) {
        send_error(400, 'Некорректный JSON.');
    }
    return $data;
}
