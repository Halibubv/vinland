<?php
// Проверка полей формы. Каждая функция берёт поле из $data и либо возвращает
// правильное значение, либо сразу отвечает ошибкой 422 с текстом для этого поля.

function invalid($field, $message)
{
    send_error(422, 'Проверьте поля формы.', [$field => $message]);
}

// Сколько символов в строке. strlen считает байты, а русская буква занимает 2 байта,
// поэтому считаем символы регулярным выражением (флаг u — работать с UTF-8).
function text_length($text)
{
    return preg_match_all('/./us', $text);
}

// Обязательный текст, например имя или название.
function text_value($data, $field, $maxLength)
{
    $value = $data[$field] ?? '';
    if (!is_string($value)) {
        invalid($field, 'Введите текст.');
    }
    $value = trim($value);
    if ($value === '') {
        invalid($field, 'Обязательное поле.');
    }
    if (text_length($value) > $maxLength) {
        invalid($field, 'Слишком длинный текст.');
    }
    return $value;
}

// Необязательный текст, например заметка. Пустое поле превращается в null (в базе NULL).
function optional_text_value($data, $field, $maxLength)
{
    $value = $data[$field] ?? null;
    if ($value === null) {
        return null;
    }
    if (!is_string($value)) {
        invalid($field, 'Введите текст.');
    }
    $value = trim($value);
    if (text_length($value) > $maxLength) {
        invalid($field, 'Слишком длинный текст.');
    }
    if ($value === '') {
        return null;
    }
    return $value;
}

// Число не меньше нуля, до двух знаков после точки: 0, 12, 52.5.
// Регулярное выражение не пропустит "-1", "1e5", "abc" и пустую строку.
function number_value($data, $field, $max)
{
    $value = $data[$field] ?? null;
    if (!is_int($value) && !is_float($value) && !is_string($value)) {
        invalid($field, 'Введите число.');
    }
    if (!preg_match('/^\d+(\.\d{1,2})?$/', (string) $value)) {
        invalid($field, 'Введите неотрицательное число, до двух знаков после точки.');
    }
    $number = (float) $value;
    if ($number > $max) {
        invalid($field, 'Значение слишком большое.');
    }
    return $number;
}

// Целое число не меньше нуля: 0, 8, 12.
function whole_number_value($data, $field, $max)
{
    $value = $data[$field] ?? null;
    if (!is_int($value) && !is_string($value)) {
        invalid($field, 'Введите число.');
    }
    if (!preg_match('/^\d+$/', (string) $value)) {
        invalid($field, 'Введите целое неотрицательное число.');
    }
    $number = (int) $value;
    if ($number > $max) {
        invalid($field, 'Значение слишком большое.');
    }
    return $number;
}

// id записи из базы: целое число больше нуля.
function id_value($data, $field)
{
    $id = whole_number_value($data, $field, PHP_INT_MAX);
    if ($id === 0) {
        invalid($field, 'Значение должно быть больше нуля.');
    }
    return $id;
}

// Дата в виде 2026-11-20.
function date_value($data, $field)
{
    $value = $data[$field] ?? null;
    if (!is_string($value)) {
        invalid($field, 'Выберите дату.');
    }
    // Если дату нельзя разобрать или она не существует (2026-02-30), PHP вернёт
    // другую строку, и сравнение не совпадёт.
    $date = DateTime::createFromFormat('Y-m-d', $value);
    if (!$date || $date->format('Y-m-d') !== $value || $value < '1900-01-01' || $value > '2100-12-31') {
        invalid($field, 'Введите корректную дату.');
    }
    return $value;
}

// Дата тренировки или приёма пищи: не в будущем.
// Один день запаса: у пользователя может быть уже завтра, а у сервера ещё сегодня.
function past_date_value($data, $field)
{
    $value = date_value($data, $field);
    if ($value > date('Y-m-d', strtotime('+1 day'))) {
        invalid($field, 'Нельзя записать на будущую дату.');
    }
    return $value;
}

function email_value($data)
{
    $email = strtolower(text_value($data, 'email', 255));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        invalid('email', 'Введите корректный email.');
    }
    return $email;
}

// Пароль от 10 до 72 символов. Больше 72 нельзя: password_hash учитывает только первые 72 байта.
function password_value($data)
{
    $password = $data['password'] ?? null;
    if (!is_string($password)) {
        invalid('password', 'Введите пароль.');
    }
    if (strlen($password) < 10 || strlen($password) > 72) {
        invalid('password', 'Пароль должен содержать от 10 до 72 байт.');
    }
    return $password;
}

function meal_type_value($data)
{
    $type = $data['meal_type'] ?? null;
    if (!in_array($type, ['breakfast', 'lunch', 'dinner', 'snack'], true)) {
        invalid('meal_type', 'Выберите тип приёма пищи.');
    }
    return $type;
}

// Список из формы, например продукты приёма пищи или подходы упражнения.
function list_value($data, $field, $message)
{
    $list = $data[$field] ?? [];
    if (!is_array($list)) {
        invalid($field, $message);
    }
    return $list;
}
