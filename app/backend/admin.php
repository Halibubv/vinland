<?php
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
    $input = ['name' => text_value($data, 'name', 150), 'is_active' => active_value($data)];
    if ($kind === 'exercises') {
        $input['muscle_group'] = optional_text_value($data, 'muscle_group', 100);
        $input['description'] = optional_text_value($data, 'description', 10000);
    } else {
        foreach (['calories', 'protein', 'fat', 'carbs'] as $nutrient) {
            $field = $nutrient . '_per_100g';
            $input[$field] = number_value($data, $field, 999999.99);
        }
    }
    return $input;
}

function catalog_columns(string $kind): string
{
    return $kind === 'exercises'
        ? 'id, name, muscle_group, description, is_active'
        : 'id, name, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, is_active';
}

function admin_catalog(string $kind): never
{
    // The resource name is accepted only from the two routes in index.php.
    $rows = query('SELECT ' . catalog_columns($kind) . ' FROM ' . $kind . ' ORDER BY name, id')->fetchAll();
    respond([$kind => $rows]);
}

function admin_write_catalog(string $kind, array $input, ?int $id = null): never
{
    if ($kind === 'exercises') {
        $values = [$input['name'], $input['muscle_group'], $input['description'], $input['is_active'] ? 'true' : 'false'];
        $columns = 'name, muscle_group, description, is_active';
        $assignments = 'name = ?, muscle_group = ?, description = ?, is_active = ?';
    } else {
        $values = [$input['name'], $input['calories_per_100g'], $input['protein_per_100g'],
            $input['fat_per_100g'], $input['carbs_per_100g'], $input['is_active'] ? 'true' : 'false'];
        $columns = 'name, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, is_active';
        $assignments = 'name = ?, calories_per_100g = ?, protein_per_100g = ?, fat_per_100g = ?, carbs_per_100g = ?, is_active = ?';
    }
    if ($id === null) {
        $placeholders = implode(', ', array_fill(0, count($values), '?'));
        $row = query("INSERT INTO $kind ($columns) VALUES ($placeholders) RETURNING " . catalog_columns($kind), $values)->fetch();
        respond([substr($kind, 0, -1) => $row], 201);
    }
    $values[] = $id;
    $row = query("UPDATE $kind SET $assignments WHERE id = ? RETURNING " . catalog_columns($kind), $values)->fetch();
    if (!$row) {
        throw new ApiError(404, 'Запись справочника не найдена.');
    }
    respond([substr($kind, 0, -1) => $row]);
}
