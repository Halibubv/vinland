<?php
// Дневник питания: приёмы пищи пользователя и продукты в них.
// В meal_items хранится снимок названия и КБЖУ продукта на момент записи,
// поэтому правка справочника не меняет уже записанную историю.
declare(strict_types=1);

function meal_input(array $data): array
{
    $items = $data['items'] ?? [];
    if (!is_array($items) || !array_is_list($items)) {
        invalid('items', 'Передайте список продуктов.');
    }
    $preparedItems = [];
    foreach ($items as $item) {
        if (!is_array($item)) {
            invalid('items', 'Позиция указана некорректно.');
        }
        // id есть у уже сохранённой позиции, product_id — у новой.
        $itemId = null;
        if (array_key_exists('id', $item)) {
            $itemId = id_value($item, 'id');
        }
        $productId = null;
        if (array_key_exists('product_id', $item)) {
            $productId = id_value($item, 'product_id');
        }
        $preparedItems[] = [
            'id' => $itemId,
            'product_id' => $productId,
            'quantity_g' => number_value($item, 'quantity_g', 999999, false, false, true),
        ];
    }
    if (count($preparedItems) === 0) {
        invalid('items', 'Добавьте хотя бы один продукт.');
    }
    return [
        'meal_date' => date_value($data, 'meal_date'),
        'meal_type' => meal_type_value($data),
        'items' => $preparedItems,
    ];
}

// Приём пищи ищем сразу по id и владельцу: чужой выглядит так же, как несуществующий.
function owned_meal(int $mealId, int $userId, bool $lock = false): array
{
    $sql = 'SELECT id, meal_date, meal_type, created_at FROM meals WHERE id = ? AND user_id = ?';
    if ($lock) {
        $sql .= ' FOR UPDATE';
    }
    $meal = query($sql, [$mealId, $userId])->fetch();
    if (!$meal) {
        throw new ApiError(404, 'Приём пищи не найден.');
    }
    return $meal;
}

function meal_payload(int $mealId, int $userId): array
{
    $meal = owned_meal($mealId, $userId);
    $meal['items'] = query('SELECT id, product_id, product_name_snapshot, quantity_g, calories_snapshot,
        protein_snapshot, fat_snapshot, carbs_snapshot FROM meal_items WHERE meal_id = ? ORDER BY id', [$mealId])->fetchAll();
    $meal['totals'] = nutrition_totals($meal['items']);
    return $meal;
}

// Создаёт приём пищи ($mealId = null) или сохраняет изменения в существующем.
// Всё в одной транзакции: при любой ошибке в базе ничего не меняется.
function write_meal(int $userId, array $input, ?int $mealId = null): array
{
    $db = database();
    $db->beginTransaction();
    try {
        $previousItems = [];
        if ($mealId === null) {
            $mealId = insert('INSERT INTO meals (user_id, meal_date, meal_type) VALUES (?, ?, ?)', [
                $userId, $input['meal_date'], $input['meal_type'],
            ]);
        } else {
            owned_meal($mealId, $userId, true);
            $rows = query('SELECT * FROM meal_items WHERE meal_id = ? FOR UPDATE', [$mealId])->fetchAll();
            foreach ($rows as $row) {
                $previousItems[(int) $row['id']] = $row;
            }
            query('UPDATE meals SET meal_date = ?, meal_type = ? WHERE id = ?', [$input['meal_date'], $input['meal_type'], $mealId]);
        }

        $keptItemIds = [];
        foreach ($input['items'] as $item) {
            // Уже сохранённая позиция: меняем только граммы, продукт и снимок КБЖУ остаются прежними.
            if ($item['id'] !== null) {
                $alreadyListed = isset($keptItemIds[$item['id']]);
                $belongsToMeal = isset($previousItems[$item['id']]);
                if ($alreadyListed || !$belongsToMeal) {
                    invalid('items', 'Позиция не принадлежит этому приёму пищи.');
                }
                $keptItemIds[$item['id']] = true;
                query('UPDATE meal_items SET quantity_g = ? WHERE id = ?', [$item['quantity_g'], $item['id']]);
                continue;
            }

            // Новая позиция: берём продукт из справочника и сохраняем его снимок.
            if ($item['product_id'] === null) {
                invalid('product_id', 'Выберите продукт.');
            }
            $product = query('SELECT id, name, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g
                FROM products WHERE id = ? AND is_active = TRUE', [$item['product_id']])->fetch();
            if (!$product) {
                invalid('product_id', 'Выберите активный продукт из справочника.');
            }
            query('INSERT INTO meal_items (meal_id, product_id, product_name_snapshot, quantity_g, calories_snapshot,
                protein_snapshot, fat_snapshot, carbs_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
                $mealId, $product['id'], $product['name'], $item['quantity_g'], $product['calories_per_100g'],
                $product['protein_per_100g'], $product['fat_per_100g'], $product['carbs_per_100g'],
            ]);
        }

        // Позиции, которых нет в новом списке, пользователь удалил.
        foreach ($previousItems as $previousId => $previousItem) {
            if (!isset($keptItemIds[$previousId])) {
                query('DELETE FROM meal_items WHERE meal_id = ? AND id = ?', [$mealId, $previousId]);
            }
        }
        $db->commit();
    } catch (Throwable $error) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $error;
    }
    return meal_payload($mealId, $userId);
}

function list_products(): never
{
    $products = query('SELECT id, name, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g
        FROM products WHERE is_active = TRUE ORDER BY name, id')->fetchAll();
    respond(['products' => $products]);
}

// Без даты — все приёмы пищи пользователя, с датой — только за этот день.
function list_meals(int $userId, ?string $date = null): never
{
    $sql = 'SELECT id FROM meals WHERE user_id = ?';
    $params = [$userId];
    if ($date !== null) {
        $sql .= ' AND meal_date = ?';
        $params[] = $date;
    }
    $sql .= ' ORDER BY meal_date DESC, id DESC';
    $rows = query($sql, $params)->fetchAll();

    $meals = [];
    foreach ($rows as $row) {
        $meals[] = meal_payload((int) $row['id'], $userId);
    }
    respond(['meals' => $meals]);
}

function delete_meal(int $mealId, int $userId): never
{
    $deleted = query('DELETE FROM meals WHERE id = ? AND user_id = ?', [$mealId, $userId]);
    if ($deleted->rowCount() !== 1) {
        throw new ApiError(404, 'Приём пищи не найден.');
    }
    respond(['deleted' => true]);
}
