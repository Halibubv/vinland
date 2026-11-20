<?php
// Дневник питания. Как это лежит в базе:
//   meals      — приём пищи: пользователь, дата, тип (завтрак, обед, ужин, перекус);
//   meal_items — продукты в приёме пищи и их граммы.
// В meal_items копируются название и КБЖУ продукта на момент записи (поля *_snapshot).
// Поэтому, если админ потом поменяет продукт, старые записи в дневнике не изменятся.

// КБЖУ приёма пищи: в базе КБЖУ на 100 г, поэтому граммы * значение / 100.
function meal_totals($items)
{
    $calories = 0;
    $protein = 0;
    $fat = 0;
    $carbs = 0;
    foreach ($items as $item) {
        $grams = (float) $item['quantity_g'];
        $calories += $grams * $item['calories_snapshot'] / 100;
        $protein += $grams * $item['protein_snapshot'] / 100;
        $fat += $grams * $item['fat_snapshot'] / 100;
        $carbs += $grams * $item['carbs_snapshot'] / 100;
    }
    return [
        'calories' => round($calories, 2),
        'protein' => round($protein, 2),
        'fat' => round($fat, 2),
        'carbs' => round($carbs, 2),
    ];
}

// Приём пищи с продуктами и итогом КБЖУ. Чужой приём пищи — ошибка 404, как несуществующий.
function find_meal($mealId, $userId)
{
    $meal = query('SELECT id, meal_date, meal_type, created_at FROM meals WHERE id = ? AND user_id = ?',
        [$mealId, $userId])->fetch();
    if (!$meal) {
        send_error(404, 'Приём пищи не найден.');
    }

    // Картинку берём из справочника продуктов (JOIN), а КБЖУ — из сохранённой копии.
    $meal['items'] = query('SELECT mi.id, mi.product_id, mi.product_name_snapshot, mi.quantity_g, mi.calories_snapshot,
            mi.protein_snapshot, mi.fat_snapshot, mi.carbs_snapshot, p.image
        FROM meal_items mi
        JOIN products p ON p.id = mi.product_id
        WHERE mi.meal_id = ?
        ORDER BY mi.id', [$mealId])->fetchAll();
    $meal['totals'] = meal_totals($meal['items']);
    return $meal;
}

// Приёмы пищи пользователя, новые сверху. Если передана дата — только за этот день.
function list_meals($userId, $date = null)
{
    if ($date === null) {
        $rows = query('SELECT id FROM meals WHERE user_id = ? ORDER BY meal_date DESC, id DESC', [$userId])->fetchAll();
    } else {
        $rows = query('SELECT id FROM meals WHERE user_id = ? AND meal_date = ? ORDER BY id DESC', [$userId, $date])->fetchAll();
    }
    $meals = [];
    foreach ($rows as $row) {
        $meals[] = find_meal($row['id'], $userId);
    }
    return $meals;
}

// Проверяем форму приёма пищи. У продукта, который уже был сохранён, есть id;
// у нового продукта — product_id (id из справочника).
function meal_input($data)
{
    $items = [];
    foreach (list_value($data, 'items', 'Передайте список продуктов.') as $item) {
        $id = null;
        if (isset($item['id'])) {
            $id = id_value($item, 'id');
        }
        $productId = null;
        if (isset($item['product_id'])) {
            $productId = id_value($item, 'product_id');
        }
        $grams = number_value($item, 'quantity_g', 999999);
        if ($grams <= 0) {
            invalid('quantity_g', 'Значение должно быть больше нуля.');
        }
        $items[] = ['id' => $id, 'product_id' => $productId, 'quantity_g' => $grams];
    }
    if (count($items) === 0) {
        invalid('items', 'Добавьте хотя бы один продукт.');
    }

    return [
        'meal_date' => past_date_value($data, 'meal_date'),
        'meal_type' => meal_type_value($data),
        'items' => $items,
    ];
}

// Сохранить приём пищи: без $mealId — новый, с $mealId — правка.
function save_meal($userId, $data, $mealId = null)
{
    $input = meal_input($data);

    // Продукты, которые уже были в этом приёме пищи: id позиции => строка из базы.
    $oldItems = [];
    if ($mealId !== null) {
        find_meal($mealId, $userId); // 404, если приём пищи чужой или его нет
        $rows = query('SELECT * FROM meal_items WHERE meal_id = ?', [$mealId])->fetchAll();
        foreach ($rows as $row) {
            $oldItems[$row['id']] = $row;
        }
    }

    // Сначала проверяем все продукты и готовим строки для записи, пока в базе ничего не меняли.
    $newItems = [];
    foreach ($input['items'] as $item) {
        if ($item['id'] !== null) {
            // Уже сохранённый продукт: оставляем старые название и КБЖУ, меняем только граммы.
            if (!isset($oldItems[$item['id']])) {
                invalid('items', 'Позиция не принадлежит этому приёму пищи.');
            }
            $old = $oldItems[$item['id']];
            unset($oldItems[$item['id']]); // одну и ту же позицию нельзя передать дважды
            $newItems[] = [
                'product_id' => $old['product_id'],
                'name' => $old['product_name_snapshot'],
                'calories' => $old['calories_snapshot'],
                'protein' => $old['protein_snapshot'],
                'fat' => $old['fat_snapshot'],
                'carbs' => $old['carbs_snapshot'],
                'grams' => $item['quantity_g'],
            ];
        } else {
            // Новый продукт: берём его название и КБЖУ из справочника.
            if ($item['product_id'] === null) {
                invalid('product_id', 'Выберите продукт.');
            }
            $product = query('SELECT * FROM products WHERE id = ? AND is_active = TRUE AND (user_id IS NULL OR user_id = ?)',
                [$item['product_id'], $userId])->fetch();
            if (!$product) {
                invalid('product_id', 'Выберите активный продукт из справочника.');
            }
            $newItems[] = [
                'product_id' => $product['id'],
                'name' => $product['name'],
                'calories' => $product['calories_per_100g'],
                'protein' => $product['protein_per_100g'],
                'fat' => $product['fat_per_100g'],
                'carbs' => $product['carbs_per_100g'],
                'grams' => $item['quantity_g'],
            ];
        }
    }

    // Записываем. Транзакция: либо сохранится всё, либо (если база упадёт посередине) ничего.
    $db = database();
    $db->beginTransaction();

    if ($mealId === null) {
        $mealId = insert('INSERT INTO meals (user_id, meal_date, meal_type) VALUES (?, ?, ?)',
            [$userId, $input['meal_date'], $input['meal_type']]);
    } else {
        query('UPDATE meals SET meal_date = ?, meal_type = ? WHERE id = ?', [$input['meal_date'], $input['meal_type'], $mealId]);
        // Старый список продуктов удаляем и записываем новый целиком.
        query('DELETE FROM meal_items WHERE meal_id = ?', [$mealId]);
    }

    foreach ($newItems as $item) {
        query('INSERT INTO meal_items (meal_id, product_id, product_name_snapshot, quantity_g,
                calories_snapshot, protein_snapshot, fat_snapshot, carbs_snapshot)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [$mealId, $item['product_id'], $item['name'], $item['grams'],
            $item['calories'], $item['protein'], $item['fat'], $item['carbs']]);
    }

    $db->commit();
    return find_meal($mealId, $userId);
}

function delete_meal($mealId, $userId)
{
    find_meal($mealId, $userId); // 404, если приём пищи чужой или его нет
    // Продукты приёма пищи удалятся вместе с ним (ON DELETE CASCADE).
    query('DELETE FROM meals WHERE id = ?', [$mealId]);
}
