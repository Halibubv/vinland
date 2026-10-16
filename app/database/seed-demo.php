<?php
declare(strict_types=1);
require dirname(__DIR__) . '/backend/config.php';
require dirname(__DIR__) . '/backend/database.php';
// CLI only: creates a demo account with three weeks of workouts and a week of meals,
// so every screen has something to show. Run after migrations; safe to re-run.
// Usage: php database/seed-demo.php [email] [password]
if (PHP_SAPI !== 'cli') {
    exit(1);
}
// Same zone as backend/bootstrap.php, so "today" in the seed is today in the app.
date_default_timezone_set('Europe/Moscow');

$email = strtolower($argv[1] ?? 'demo@vinland.local');
$password = $argv[2] ?? 'VinlandDemo2026';

$db = database();
$db->beginTransaction();
$old = query('SELECT id FROM users WHERE email = ?', [$email])->fetchColumn();
if ($old) {
    query('DELETE FROM meals WHERE user_id = ?', [$old]);
    query('DELETE FROM workouts WHERE user_id = ?', [$old]);
    query('DELETE FROM users WHERE id = ?', [$old]);
}
$userId = (int) query('INSERT INTO users (email, password_hash, name, target_calories, target_protein_g, target_fat_g, target_carbs_g)
    VALUES (?, ?, ?, 2400, 160, 80, 260) RETURNING id', [$email, password_hash($password, PASSWORD_DEFAULT), 'Алексей Смирнов'])->fetchColumn();

$exerciseId = fn (string $name): int => (int) (query('SELECT id FROM exercises WHERE name = ?', [$name])->fetchColumn()
    ?: throw new RuntimeException("Exercise not found: {$name}. Run migrations first."));
$product = fn (string $name): array => query('SELECT * FROM products WHERE name = ?', [$name])->fetch()
    ?: throw new RuntimeException("Product not found: {$name}. Run migrations first.");

// Days ago => [title, [exercise, sets, reps, weight]...]
$plan = [
    0 => ['Ноги и грудь', [['Приседания со штангой', 3, 8, 100], ['Жим лёжа', 3, 10, 80]]],
    3 => ['Спина и плечи', [['Подтягивания', 3, 8, 0], ['Армейский жим', 3, 10, 45], ['Тяга штанги в наклоне', 3, 10, 60], ['Махи гантелями в стороны', 3, 15, 10]]],
    5 => ['Руки и пресс', [['Подъём штанги на бицепс', 3, 12, 30], ['Французский жим', 3, 12, 25], ['Планка', 3, 60, 0]]],
    7 => ['Ноги', [['Жим ногами', 4, 10, 180], ['Выпады с гантелями', 3, 10, 24], ['Румынская тяга', 3, 8, 90], ['Подъём на носки стоя', 3, 15, 60]]],
    10 => ['Грудь и трицепс', [['Жим лёжа', 4, 8, 82.5], ['Жим гантелей на наклонной скамье', 3, 10, 28], ['Отжимания на брусьях', 3, 12, 0]]],
    12 => ['Спина', [['Становая тяга', 3, 5, 140], ['Тяга верхнего блока', 3, 12, 65]]],
    16 => ['Ноги и грудь', [['Приседания со штангой', 3, 8, 95], ['Жим лёжа', 3, 10, 77.5]]],
];
foreach ($plan as $daysAgo => [$title, $exercises]) {
    $date = (new DateTimeImmutable("-{$daysAgo} days"))->format('Y-m-d');
    $workoutId = query('INSERT INTO workouts (user_id, workout_date, notes) VALUES (?, ?, ?) RETURNING id', [$userId, $date, $title])->fetchColumn();
    foreach ($exercises as $position => [$name, $sets, $reps, $weight]) {
        $rowId = query('INSERT INTO workout_exercises (workout_id, exercise_id, position) VALUES (?, ?, ?) RETURNING id',
            [$workoutId, $exerciseId($name), $position + 1])->fetchColumn();
        for ($set = 1; $set <= $sets; $set++) {
            query('INSERT INTO workout_sets (workout_exercise_id, set_number, repetitions, weight_kg) VALUES (?, ?, ?, ?)',
                [$rowId, $set, $reps, $weight]);
        }
    }
}

$menu = [
    'breakfast' => [[['Овсяные хлопья', 80], ['Банан', 120], ['Молоко 2,5%', 200]], [['Яйцо куриное', 120], ['Хлеб цельнозерновой', 60], ['Огурец', 100]]],
    'lunch' => [[['Куриная грудка', 200], ['Рис варёный', 250], ['Брокколи', 150]], [['Говядина постная', 180], ['Гречка варёная', 250], ['Помидор', 150]]],
    'snack' => [[['Греческий йогурт 2%', 200], ['Мёд', 15]], [['Творог 5%', 200], ['Яблоко', 150]], [['Миндаль', 30], ['Банан', 120]]],
    'dinner' => [[['Лосось', 200], ['Картофель варёный', 250], ['Огурец', 100]], [['Индейка, филе', 200], ['Макароны варёные', 200], ['Сыр твёрдый', 20]]],
];
for ($daysAgo = 6; $daysAgo >= 0; $daysAgo--) {
    $date = (new DateTimeImmutable("-{$daysAgo} days"))->format('Y-m-d');
    foreach ($menu as $type => $options) {
        if ($daysAgo === 0 && $type === 'snack') {
            continue; // leave one empty slot today to show the empty state
        }
        $mealId = query('INSERT INTO meals (user_id, meal_date, meal_type) VALUES (?, ?, ?) RETURNING id', [$userId, $date, $type])->fetchColumn();
        foreach ($options[$daysAgo % count($options)] as [$name, $grams]) {
            $p = $product($name);
            query('INSERT INTO meal_items (meal_id, product_id, product_name_snapshot, quantity_g, calories_snapshot, protein_snapshot, fat_snapshot, carbs_snapshot)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [$mealId, $p['id'], $p['name'], $grams * (0.9 + ($daysAgo % 3) * 0.1),
                $p['calories_per_100g'], $p['protein_per_100g'], $p['fat_per_100g'], $p['carbs_per_100g']]);
        }
    }
}
$db->commit();
echo "Demo account: {$email} / {$password}\n";
