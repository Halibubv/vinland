<?php
// Администрирование справочников: упражнения (exercises) и продукты (products).
// $kind приходит только из маршрута в index.php, поэтому его можно подставлять в SQL как имя таблицы.
declare(strict_types=1);

function active_value(array $data): bool
{
    if (!array_key_exists('is_active', $data) || !is_bool($data['is_active'])) {
        invalid('is_active', 'Выберите состояние записи.');
    }
    return $data['is_active'];
}

function catalog_input(string $kind, array $data): array
{
    $input = [
        'name' => text_value($data, 'name', 150),
        'is_active' => active_value($data),
    ];
    if ($kind === 'exercises') {
        $input['muscle_group'] = optional_text_value($data, 'muscle_group', 100);
        $input['description'] = optional_text_value($data, 'description', 10000);
    } else {
        $input['calories_per_100g'] = number_value($data, 'calories_per_100g', 999999.99);
        $input['protein_per_100g'] = number_value($data, 'protein_per_100g', 999999.99);
        $input['fat_per_100g'] = number_value($data, 'fat_per_100g', 999999.99);
        $input['carbs_per_100g'] = number_value($data, 'carbs_per_100g', 999999.99);
    }
    return $input;
}

function catalog_columns(string $kind): string
{
    if ($kind === 'exercises') {
        return 'id, name, muscle_group, description, is_active';
    }
    return 'id, name, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, is_active';
}

// Ключ одной записи в ответе: {"exercise": {...}} или {"product": {...}}.
function catalog_item_key(string $kind): string
{
    if ($kind === 'exercises') {
        return 'exercise';
    }
    return 'product';
}

// Одна запись справочника по id или null, если такой нет.
// MySQL хранит is_active как 1 или 0 — в ответе отдаём true или false.
function catalog_row(string $kind, int $id): ?array
{
    $row = query('SELECT ' . catalog_columns($kind) . ' FROM ' . $kind . ' WHERE id = ?', [$id])->fetch();
    if (!$row) {
        return null;
    }
    $row['is_active'] = (bool) $row['is_active'];
    return $row;
}

function admin_catalog(string $kind): never
{
    $rows = query('SELECT ' . catalog_columns($kind) . ' FROM ' . $kind . ' ORDER BY name, id')->fetchAll();
    foreach ($rows as &$row) {
        $row['is_active'] = (bool) $row['is_active'];
    }
    unset($row);
    respond([$kind => $rows]);
}

// Без $id создаёт новую запись, с $id — изменяет существующую.
function admin_write_catalog(string $kind, array $input, ?int $id = null): never
{
    // В MySQL BOOLEAN — это число: 1 (активно) или 0 (отключено).
    $isActive = $input['is_active'] ? 1 : 0;
    if ($kind === 'exercises') {
        $values = [$input['name'], $input['muscle_group'], $input['description'], $isActive];
        $insertSql = 'INSERT INTO exercises (name, muscle_group, description, is_active) VALUES (?, ?, ?, ?)';
        $updateSql = 'UPDATE exercises SET name = ?, muscle_group = ?, description = ?, is_active = ? WHERE id = ?';
    } else {
        $values = [$input['name'], $input['calories_per_100g'], $input['protein_per_100g'],
            $input['fat_per_100g'], $input['carbs_per_100g'], $isActive];
        $insertSql = 'INSERT INTO products (name, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, is_active)
            VALUES (?, ?, ?, ?, ?, ?)';
        $updateSql = 'UPDATE products SET name = ?, calories_per_100g = ?, protein_per_100g = ?,
            fat_per_100g = ?, carbs_per_100g = ?, is_active = ? WHERE id = ?';
    }

    if ($id === null) {
        $newId = insert($insertSql, $values);
        respond([catalog_item_key($kind) => catalog_row($kind, $newId)], 201);
    }

    if (!catalog_row($kind, $id)) {
        throw new ApiError(404, 'Запись справочника не найдена.');
    }
    $values[] = $id;
    query($updateSql, $values);
    respond([catalog_item_key($kind) => catalog_row($kind, $id)]);
}
