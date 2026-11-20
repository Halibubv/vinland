<?php
// Админка: администратор добавляет и меняет записи общих справочников
// (упражнения и продукты с user_id = NULL). Удаления нет: запись можно отключить
// (is_active = 0), тогда её не видно в выборе, но старые тренировки и приёмы пищи остаются.

// Включена запись или отключена: в форме это true или false.
function active_value($data)
{
    $value = $data['is_active'] ?? null;
    if (!is_bool($value)) {
        invalid('is_active', 'Выберите состояние записи.');
    }
    return $value;
}

// В MySQL is_active хранится числом 1 или 0. В ответе отдаём true или false.
function with_active_flag($row)
{
    $row['is_active'] = $row['is_active'] == 1;
    return $row;
}

// --- Упражнения ---

function admin_list_exercises()
{
    $rows = query('SELECT id, name, muscle_group, description, image, is_active FROM exercises
        WHERE user_id IS NULL ORDER BY name, id')->fetchAll();
    $exercises = [];
    foreach ($rows as $row) {
        $exercises[] = with_active_flag($row);
    }
    return $exercises;
}

function admin_find_exercise($id)
{
    $row = query('SELECT id, name, muscle_group, description, image, is_active FROM exercises
        WHERE id = ? AND user_id IS NULL', [$id])->fetch();
    if (!$row) {
        send_error(404, 'Запись справочника не найдена.');
    }
    return with_active_flag($row);
}

// Без $id — добавить новое упражнение, с $id — изменить существующее.
function admin_save_exercise($data, $id = null)
{
    $name = text_value($data, 'name', 150);
    $muscleGroup = optional_text_value($data, 'muscle_group', 100);
    $description = optional_text_value($data, 'description', 10000);
    $isActive = active_value($data) ? 1 : 0;

    if ($id === null) {
        $id = insert('INSERT INTO exercises (name, muscle_group, description, is_active) VALUES (?, ?, ?, ?)',
            [$name, $muscleGroup, $description, $isActive]);
    } else {
        admin_find_exercise($id); // 404, если такой записи нет
        query('UPDATE exercises SET name = ?, muscle_group = ?, description = ?, is_active = ? WHERE id = ?',
            [$name, $muscleGroup, $description, $isActive, $id]);
    }
    return admin_find_exercise($id);
}

// --- Продукты ---

function admin_list_products()
{
    $rows = query('SELECT id, name, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, image, is_active
        FROM products WHERE user_id IS NULL ORDER BY name, id')->fetchAll();
    $products = [];
    foreach ($rows as $row) {
        $products[] = with_active_flag($row);
    }
    return $products;
}

function admin_find_product($id)
{
    $row = query('SELECT id, name, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, image, is_active
        FROM products WHERE id = ? AND user_id IS NULL', [$id])->fetch();
    if (!$row) {
        send_error(404, 'Запись справочника не найдена.');
    }
    return with_active_flag($row);
}

function admin_save_product($data, $id = null)
{
    $name = text_value($data, 'name', 150);
    $calories = number_value($data, 'calories_per_100g', 999999.99);
    $protein = number_value($data, 'protein_per_100g', 999999.99);
    $fat = number_value($data, 'fat_per_100g', 999999.99);
    $carbs = number_value($data, 'carbs_per_100g', 999999.99);
    $isActive = active_value($data) ? 1 : 0;

    if ($id === null) {
        $id = insert('INSERT INTO products (name, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, is_active)
            VALUES (?, ?, ?, ?, ?, ?)', [$name, $calories, $protein, $fat, $carbs, $isActive]);
    } else {
        admin_find_product($id);
        query('UPDATE products SET name = ?, calories_per_100g = ?, protein_per_100g = ?, fat_per_100g = ?,
            carbs_per_100g = ?, is_active = ? WHERE id = ?', [$name, $calories, $protein, $fat, $carbs, $isActive, $id]);
    }
    return admin_find_product($id);
}
