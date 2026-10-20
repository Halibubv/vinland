<?php
// Проверки истории питания на настоящей базе: снимки КБЖУ не меняются после правки продукта,
// отключённый продукт нельзя добавить, чужую позицию подставить нельзя. Запуск: php tests/meal-history.php
declare(strict_types=1);
require dirname(__DIR__) . '/backend/bootstrap.php';

$checks = 0;
function meal_check(bool $condition, string $name): void
{
    global $checks;
    if (!$condition) {
        throw new RuntimeException($name);
    }
    $checks++;
}

$suffix = bin2hex(random_bytes(6));
function meal_test_user(string $suffix, string $name): int
{
    return insert('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)', [
        $name . '-' . $suffix . '@example.test', password_hash('CorrectHorse42', PASSWORD_DEFAULT), $name,
    ]);
}
$firstUser = meal_test_user($suffix, 'meal-first');
$secondUser = meal_test_user($suffix, 'meal-second');
$productId = insert('INSERT INTO products (name, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g)
    VALUES (?, 200, 10, 5, 20)', ['Тестовый продукт ' . $suffix]);

$created = write_meal($firstUser, ['meal_date' => '2026-10-09', 'meal_type' => 'lunch', 'items' => [[
    'id' => null, 'product_id' => $productId, 'quantity_g' => 150,
]]]);
meal_check($created['totals'] === ['calories' => 300.0, 'protein' => 15.0, 'fat' => 7.5, 'carbs' => 30.0], '150g snapshot totals');
$itemId = (int) $created['items'][0]['id'];

query('UPDATE products SET name = ?, calories_per_100g = 999, protein_per_100g = 99, fat_per_100g = 9, carbs_per_100g = 1, is_active = FALSE WHERE id = ?', ['Изменённый продукт', $productId]);
$edited = write_meal($firstUser, ['meal_date' => '2026-10-10', 'meal_type' => 'dinner', 'items' => [[
    'id' => $itemId, 'product_id' => 999999999, 'quantity_g' => 200,
]]], (int) $created['id']);
meal_check($edited['items'][0]['product_name_snapshot'] === 'Тестовый продукт ' . $suffix, 'Name snapshot stays immutable');
meal_check($edited['totals'] === ['calories' => 400.0, 'protein' => 20.0, 'fat' => 10.0, 'carbs' => 40.0], 'Editing grams keeps old snapshots');

try {
    write_meal($firstUser, ['meal_date' => '2026-10-11', 'meal_type' => 'snack', 'items' => [[
        'id' => null, 'product_id' => $productId, 'quantity_g' => 1,
    ]]]);
    throw new RuntimeException('Inactive product was accepted as new item');
} catch (ApiError $error) {
    meal_check($error->status === 422 && isset($error->fields['product_id']), 'Inactive product rejected for new item');
}
$otherMeal = write_meal($secondUser, ['meal_date' => '2026-10-09', 'meal_type' => 'breakfast', 'items' => []]);
try {
    write_meal($secondUser, ['meal_date' => '2026-10-09', 'meal_type' => 'breakfast', 'items' => [[
        'id' => $itemId, 'product_id' => null, 'quantity_g' => 1,
    ]]], (int) $otherMeal['id']);
    throw new RuntimeException('Foreign meal item was accepted');
} catch (ApiError $error) {
    meal_check($error->status === 422 && isset($error->fields['items']), 'Foreign meal item rejected');
}
meal_check(meal_payload((int) $otherMeal['id'], $secondUser)['items'] === [], 'Foreign item attempt rolls back');
echo 'Meal history checks passed: ' . $checks . " checks\n";
