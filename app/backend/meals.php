<?php
declare(strict_types=1);

function meal_input(array $data): array
{
    $items = $data['items'] ?? [];
    if (!is_array($items) || !array_is_list($items)) {
        invalid('items', 'Передайте список продуктов.');
    }
    $prepared = [];
    foreach ($items as $item) {
        if (!is_array($item)) {
            invalid('items', 'Позиция указана некорректно.');
        }
        $prepared[] = [
            'id' => array_key_exists('id', $item) ? id_value($item, 'id') : null,
            'product_id' => array_key_exists('product_id', $item) ? id_value($item, 'product_id') : null,
            'quantity_g' => number_value($item, 'quantity_g', 999999, false, false, true),
        ];
    }
    return ['meal_date' => date_value($data, 'meal_date'), 'meal_type' => meal_type_value($data), 'items' => $prepared];
}

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

function write_meal(int $userId, array $input, ?int $mealId = null): array
{
    $db = database();
    $db->beginTransaction();
    try {
        $previousItems = [];
        if ($mealId === null) {
            $mealId = (int) query('INSERT INTO meals (user_id, meal_date, meal_type) VALUES (?, ?, ?) RETURNING id', [
                $userId, $input['meal_date'], $input['meal_type'],
            ])->fetchColumn();
        } else {
            owned_meal($mealId, $userId, true);
            foreach (query('SELECT * FROM meal_items WHERE meal_id = ? FOR UPDATE', [$mealId])->fetchAll() as $item) {
                $previousItems[(int) $item['id']] = $item;
            }
            query('UPDATE meals SET meal_date = ?, meal_type = ? WHERE id = ?', [$input['meal_date'], $input['meal_type'], $mealId]);
        }
        $kept = [];
        foreach ($input['items'] as $item) {
            if ($item['id'] !== null) {
                if (isset($kept[$item['id']]) || !isset($previousItems[$item['id']])) {
                    invalid('items', 'Позиция не принадлежит этому приёму пищи.');
                }
                $kept[$item['id']] = true;
                // Product and every snapshot remain the original server-side values.
                query('UPDATE meal_items SET quantity_g = ? WHERE id = ?', [$item['quantity_g'], $item['id']]);
                continue;
            }
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
        if ($mealId !== null && $previousItems) {
            $discarded = array_diff(array_keys($previousItems), array_keys($kept));
            if ($discarded) {
                $placeholders = implode(',', array_fill(0, count($discarded), '?'));
                query("DELETE FROM meal_items WHERE meal_id = ? AND id IN ($placeholders)", array_merge([$mealId], $discarded));
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
    respond(['products' => query('SELECT id, name, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g
        FROM products WHERE is_active = TRUE ORDER BY name, id')->fetchAll()]);
}

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
    respond(['meals' => array_map(fn (array $row): array => meal_payload((int) $row['id'], $userId), $rows)]);
}

function delete_meal(int $mealId, int $userId): never
{
    $deleted = query('DELETE FROM meals WHERE id = ? AND user_id = ?', [$mealId, $userId]);
    if ($deleted->rowCount() !== 1) {
        throw new ApiError(404, 'Приём пищи не найден.');
    }
    respond(['deleted' => true]);
}
