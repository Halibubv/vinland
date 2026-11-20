<?php
// Справочники упражнений и продуктов для обычного пользователя.
// В справочнике есть общие записи (user_id = NULL, их ведёт администратор)
// и свои записи пользователя (user_id = его id). Чужие свои записи не видны.

function list_exercises($userId)
{
    return query('SELECT id, name, muscle_group, description, image, user_id FROM exercises
        WHERE is_active = TRUE AND (user_id IS NULL OR user_id = ?)
        ORDER BY name, id', [$userId])->fetchAll();
}

function list_products($userId)
{
    return query('SELECT id, name, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, image, user_id
        FROM products WHERE is_active = TRUE AND (user_id IS NULL OR user_id = ?)
        ORDER BY name, id', [$userId])->fetchAll();
}

// Своё упражнение, которого нет в общем справочнике.
function create_own_exercise($userId, $data)
{
    $name = text_value($data, 'name', 150);
    $muscleGroup = optional_text_value($data, 'muscle_group', 100);

    $id = insert('INSERT INTO exercises (name, muscle_group, user_id) VALUES (?, ?, ?)', [$name, $muscleGroup, $userId]);
    return query('SELECT id, name, muscle_group, description, image, user_id FROM exercises WHERE id = ?', [$id])->fetch();
}

// Свой продукт: название и КБЖУ на 100 грамм.
function create_own_product($userId, $data)
{
    $name = text_value($data, 'name', 150);
    $calories = number_value($data, 'calories_per_100g', 999999.99);
    $protein = number_value($data, 'protein_per_100g', 999999.99);
    $fat = number_value($data, 'fat_per_100g', 999999.99);
    $carbs = number_value($data, 'carbs_per_100g', 999999.99);

    $id = insert('INSERT INTO products (name, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, user_id)
        VALUES (?, ?, ?, ?, ?, ?)', [$name, $calories, $protein, $fat, $carbs, $userId]);
    return query('SELECT id, name, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, image, user_id
        FROM products WHERE id = ?', [$id])->fetch();
}
