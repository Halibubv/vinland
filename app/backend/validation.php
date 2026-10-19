<?php
// Проверка данных из форм. Каждая функция либо возвращает чистое значение,
// либо останавливает запрос с ошибкой 422 и текстом для нужного поля.
declare(strict_types=1);

function invalid(string $field, string $message): never
{
    throw new ApiError(422, 'Проверьте поля формы.', [$field => $message]);
}

// Длина в символах, а не в байтах. Так кириллица считается правильно без расширения mbstring.
function text_length(string $value): int
{
    return preg_match_all('/./us', $value);
}

// preg_match('//u') возвращает 1 только для корректной строки UTF-8.
function is_utf8_text(mixed $value): bool
{
    return is_string($value) && preg_match('//u', $value) === 1;
}

function text_value(array $data, string $field, int $max, bool $required = true): string
{
    $value = $data[$field] ?? '';
    if (!is_utf8_text($value)) {
        invalid($field, 'Введите текст.');
    }
    $value = trim($value);
    $length = text_length($value);
    if ($required && $length === 0) {
        invalid($field, 'Обязательное поле.');
    }
    if ($length > $max) {
        invalid($field, 'Слишком длинный текст.');
    }
    return $value;
}

function optional_text_value(array $data, string $field, int $max): ?string
{
    if (!array_key_exists($field, $data) || $data[$field] === null) {
        return null;
    }
    $value = $data[$field];
    if (!is_utf8_text($value)) {
        invalid($field, 'Введите текст.');
    }
    $value = trim($value);
    if (text_length($value) > $max) {
        invalid($field, 'Слишком длинный текст.');
    }
    if ($value === '') {
        return null;
    }
    return $value;
}

// $integer — только целые; $nullable — пустое поле превращается в null;
// $positive — ноль не допускается.
function number_value(array $data, string $field, float $max, bool $integer = false,
    bool $nullable = false, bool $positive = false): int|float|null
{
    $value = $data[$field] ?? null;
    if ($nullable && ($value === null || $value === '')) {
        return null;
    }
    if (is_bool($value) || !is_scalar($value)) {
        invalid($field, 'Введите число.');
    }
    $value = (string) $value;
    // Проверяем запись числа регулярным выражением: так не пройдут "-1", "1e5" и " 12".
    if ($integer) {
        if (!preg_match('/^\d+$/', $value)) {
            invalid($field, 'Введите целое неотрицательное число.');
        }
    } else {
        if (!preg_match('/^\d+(?:\.\d{1,2})?$/', $value)) {
            invalid($field, 'Введите неотрицательное число, до двух знаков после точки.');
        }
    }
    $number = (float) $value;
    if ($positive && $number <= 0) {
        invalid($field, 'Значение должно быть больше нуля.');
    }
    if (!is_finite($number) || $number > $max) {
        invalid($field, 'Значение слишком большое.');
    }
    if ($integer) {
        return (int) $number;
    }
    return $number;
}

function id_value(array $data, string $field): int
{
    return number_value($data, $field, PHP_INT_MAX, true, false, true);
}

function date_value(array $data, string $field): string
{
    $value = $data[$field] ?? null;
    if (!is_string($value)) {
        invalid($field, 'Выберите дату.');
    }
    // Сравнение с исходной строкой отсекает несуществующие даты вроде 2026-02-30.
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    if (!$date || $date->format('Y-m-d') !== $value || $value < '1900-01-01' || $value > '2100-12-31') {
        invalid($field, 'Введите корректную дату.');
    }
    return $value;
}

function email_value(array $data): string
{
    $email = strtolower(text_value($data, 'email', 255));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        invalid('email', 'Введите корректный email.');
    }
    return $email;
}

function password_value(array $data): string
{
    $value = $data['password'] ?? null;
    if (!is_utf8_text($value) || str_contains($value, "\0")) {
        invalid('password', 'Введите пароль.');
    }
    // bcrypt молча обрезает пароль после 72 байт, поэтому длинные пароли не принимаем.
    $length = strlen($value);
    if ($length < 10 || $length > 72) {
        invalid('password', 'Пароль должен содержать от 10 до 72 байт.');
    }
    return $value;
}

function meal_type_value(array $data): string
{
    $value = $data['meal_type'] ?? null;
    $allowed = ['breakfast', 'lunch', 'dinner', 'snack'];
    if (!is_string($value) || !in_array($value, $allowed, true)) {
        invalid('meal_type', 'Выберите тип приёма пищи.');
    }
    return $value;
}

// КБЖУ приёма пищи считаем по сохранённым снимкам, а не по текущему продукту.
function nutrition_totals(array $items): array
{
    $totals = ['calories' => 0, 'protein' => 0, 'fat' => 0, 'carbs' => 0];
    foreach ($items as $item) {
        foreach ($totals as $name => $sum) {
            $per100g = (float) $item[$name . '_snapshot'];
            $totals[$name] = $sum + $per100g * (float) $item['quantity_g'] / 100;
        }
    }
    // Округляем только итог, чтобы не накапливать ошибку округления.
    foreach ($totals as $name => $sum) {
        $totals[$name] = round($sum, 2);
    }
    return $totals;
}
