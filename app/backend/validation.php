<?php
declare(strict_types=1);

function invalid(string $field, string $message): never
{
    throw new ApiError(422, 'Проверьте поля формы.', [$field => $message]);
}

function text_value(array $data, string $field, int $max, bool $required = true): string
{
    $value = $data[$field] ?? '';
    if (!is_string($value) || preg_match('//u', $value) !== 1) {
        invalid($field, 'Введите текст.');
    }
    $value = trim($value);
    // Count Unicode characters without adding the mbstring dependency.
    $length = preg_match_all('/./us', $value);
    if (($required && $length === 0) || $length > $max) {
        invalid($field, $length === 0 ? 'Обязательное поле.' : 'Слишком длинный текст.');
    }
    return $value;
}

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
    $pattern = $integer ? '/^\d+$/' : '/^\d+(?:\.\d{1,2})?$/';
    if (!preg_match($pattern, $value)) {
        invalid($field, $integer ? 'Введите целое неотрицательное число.' : 'Введите неотрицательное число, до двух знаков после точки.');
    }
    $number = (float) $value;
    if (!is_finite($number) || $number > $max || ($positive && $number <= 0)) {
        invalid($field, $positive && $number <= 0 ? 'Значение должно быть больше нуля.' : 'Значение слишком большое.');
    }
    return $integer ? (int) $number : $number;
}

function date_value(array $data, string $field): string
{
    $value = $data[$field] ?? null;
    if (!is_string($value)) {
        invalid($field, 'Выберите дату.');
    }
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
    if (!is_string($value) || preg_match('//u', $value) !== 1 || str_contains($value, "\0")) {
        invalid('password', 'Введите пароль.');
    }
    $length = strlen($value);
    // PASSWORD_DEFAULT currently uses bcrypt, which has a strict 72-byte input limit.
    // Rejecting longer UTF-8 input avoids silent truncation and remains safe if the default changes.
    if ($length < 10 || $length > 72) {
        invalid('password', 'Пароль должен содержать от 10 до 72 байт.');
    }
    return $value;
}

function optional_text_value(array $data, string $field, int $max): ?string
{
    if (!array_key_exists($field, $data) || $data[$field] === null) {
        return null;
    }
    $value = $data[$field];
    if (!is_string($value) || preg_match('//u', $value) !== 1) {
        invalid($field, 'Введите текст.');
    }
    $value = trim($value);
    if (preg_match_all('/./us', $value) > $max) {
        invalid($field, 'Слишком длинный текст.');
    }
    return $value === '' ? null : $value;
}

function id_value(array $data, string $field): int
{
    return number_value($data, $field, PHP_INT_MAX, true, false, true);
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

function nutrition_totals(array $items): array
{
    $totals = ['calories' => 0, 'protein' => 0, 'fat' => 0, 'carbs' => 0];
    foreach ($items as $item) {
        foreach ($totals as $name => $value) {
            $totals[$name] += (float) $item[$name . '_snapshot'] * (float) $item['quantity_g'] / 100;
        }
    }
    // Round only the final sum. The source is the saved snapshot, never the live product.
    return array_map(fn ($value) => round($value, 2), $totals);
}
