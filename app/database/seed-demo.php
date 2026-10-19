<?php
// Демо-аккаунт: три недели тренировок и неделя питания, чтобы на каждом экране было что показать.
// Запускать после миграций, только из консоли:
//   php database/seed-demo.php [email] [пароль]               — пересоздать демо-аккаунт со свежими датами
//   php database/seed-demo.php --if-missing [email] [пароль]  — создать, только если аккаунта ещё нет
// Оба варианта можно запускать сколько угодно раз.
declare(strict_types=1);
require dirname(__DIR__) . '/backend/config.php';
require dirname(__DIR__) . '/backend/database.php';

if (PHP_SAPI !== 'cli') {
    exit(1);
}
// Тот же часовой пояс, что в backend/bootstrap.php, чтобы «сегодня» совпадало с приложением.
date_default_timezone_set('Europe/Moscow');

$onlyIfMissing = false;
$positionalArgs = [];
foreach (array_slice($argv, 1) as $argument) {
    if ($argument === '--if-missing') {
        $onlyIfMissing = true;
    } else {
        $positionalArgs[] = $argument;
    }
}
$email = strtolower($positionalArgs[0] ?? 'demo@vinland.local');
$password = $positionalArgs[1] ?? 'VinlandDemo2026';

function exercise_id_by_name(string $name): int
{
    $id = query('SELECT id FROM exercises WHERE name = ?', [$name])->fetchColumn();
    if (!$id) {
        throw new RuntimeException("Exercise not found: {$name}. Run migrations first.");
    }
    return (int) $id;
}

function product_by_name(string $name): array
{
    $product = query('SELECT * FROM products WHERE name = ?', [$name])->fetch();
    if (!$product) {
        throw new RuntimeException("Product not found: {$name}. Run migrations first.");
    }
    return $product;
}

function date_days_ago(int $daysAgo): string
{
    return (new DateTimeImmutable("-{$daysAgo} days"))->format('Y-m-d');
}

$existingId = query('SELECT id FROM users WHERE email = ?', [$email])->fetchColumn();
if ($existingId && $onlyIfMissing) {
    echo "Demo account already exists: {$email}\n";
    exit(0);
}

$db = database();
$db->beginTransaction();

// Старый демо-аккаунт удаляем вместе с его записями и создаём заново.
if ($existingId) {
    query('DELETE FROM meals WHERE user_id = ?', [$existingId]);
    query('DELETE FROM workouts WHERE user_id = ?', [$existingId]);
    query('DELETE FROM users WHERE id = ?', [$existingId]);
}
$userId = (int) query('INSERT INTO users (email, password_hash, name, target_calories, target_protein_g, target_fat_g, target_carbs_g)
    VALUES (?, ?, ?, 2400, 160, 80, 260) RETURNING id', [$email, password_hash($password, PASSWORD_DEFAULT), 'Алексей Смирнов'])->fetchColumn();

// Тренировки: сколько дней назад => [название, список упражнений].
// Упражнение записано как [название, подходов, повторений, вес в кг].
$workoutPlan = [
    0 => ['Ноги и грудь', [['Приседания со штангой', 3, 8, 100], ['Жим лёжа', 3, 10, 80]]],
    3 => ['Спина и плечи', [['Подтягивания', 3, 8, 0], ['Армейский жим', 3, 10, 45], ['Тяга штанги в наклоне', 3, 10, 60], ['Махи гантелями в стороны', 3, 15, 10]]],
    5 => ['Руки и пресс', [['Подъём штанги на бицепс', 3, 12, 30], ['Французский жим', 3, 12, 25], ['Планка', 3, 60, 0]]],
    7 => ['Ноги', [['Жим ногами', 4, 10, 180], ['Выпады с гантелями', 3, 10, 24], ['Румынская тяга', 3, 8, 90], ['Подъём на носки стоя', 3, 15, 60]]],
    10 => ['Грудь и трицепс', [['Жим лёжа', 4, 8, 82.5], ['Жим гантелей на наклонной скамье', 3, 10, 28], ['Отжимания на брусьях', 3, 12, 0]]],
    12 => ['Спина', [['Становая тяга', 3, 5, 140], ['Тяга верхнего блока', 3, 12, 65]]],
    16 => ['Ноги и грудь', [['Приседания со штангой', 3, 8, 95], ['Жим лёжа', 3, 10, 77.5]]],
];
foreach ($workoutPlan as $daysAgo => [$title, $exercises]) {
    $workoutId = query('INSERT INTO workouts (user_id, workout_date, notes) VALUES (?, ?, ?) RETURNING id',
        [$userId, date_days_ago($daysAgo), $title])->fetchColumn();
    foreach ($exercises as $index => [$name, $setCount, $repetitions, $weight]) {
        $workoutExerciseId = query('INSERT INTO workout_exercises (workout_id, exercise_id, position) VALUES (?, ?, ?) RETURNING id',
            [$workoutId, exercise_id_by_name($name), $index + 1])->fetchColumn();
        for ($setNumber = 1; $setNumber <= $setCount; $setNumber++) {
            query('INSERT INTO workout_sets (workout_exercise_id, set_number, repetitions, weight_kg) VALUES (?, ?, ?, ?)',
                [$workoutExerciseId, $setNumber, $repetitions, $weight]);
        }
    }
}

// Питание: для каждого приёма пищи несколько вариантов меню, дни чередуют их по кругу.
// Продукт записан как [название, граммы].
$menu = [
    'breakfast' => [[['Овсяные хлопья', 80], ['Банан', 120], ['Молоко 2,5%', 200]], [['Яйцо куриное', 120], ['Хлеб цельнозерновой', 60], ['Огурец', 100]]],
    'lunch' => [[['Куриная грудка', 200], ['Рис варёный', 250], ['Брокколи', 150]], [['Говядина постная', 180], ['Гречка варёная', 250], ['Помидор', 150]]],
    'snack' => [[['Греческий йогурт 2%', 200], ['Мёд', 15]], [['Творог 5%', 200], ['Яблоко', 150]], [['Миндаль', 30], ['Банан', 120]]],
    'dinner' => [[['Лосось', 200], ['Картофель варёный', 250], ['Огурец', 100]], [['Индейка, филе', 200], ['Макароны варёные', 200], ['Сыр твёрдый', 20]]],
];
for ($daysAgo = 6; $daysAgo >= 0; $daysAgo--) {
    // Порции 90%, 100% или 110%, чтобы график калорий не был ровной линией.
    $portionFactor = 0.9 + ($daysAgo % 3) * 0.1;
    foreach ($menu as $mealType => $variants) {
        // Сегодня перекус пропускаем, чтобы было видно, как выглядит пустой приём пищи.
        if ($daysAgo === 0 && $mealType === 'snack') {
            continue;
        }
        $mealId = query('INSERT INTO meals (user_id, meal_date, meal_type) VALUES (?, ?, ?) RETURNING id',
            [$userId, date_days_ago($daysAgo), $mealType])->fetchColumn();
        $todaysVariant = $variants[$daysAgo % count($variants)];
        foreach ($todaysVariant as [$productName, $grams]) {
            $product = product_by_name($productName);
            query('INSERT INTO meal_items (meal_id, product_id, product_name_snapshot, quantity_g, calories_snapshot, protein_snapshot, fat_snapshot, carbs_snapshot)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [$mealId, $product['id'], $product['name'], $grams * $portionFactor,
                $product['calories_per_100g'], $product['protein_per_100g'], $product['fat_per_100g'], $product['carbs_per_100g']]);
        }
    }
}
$db->commit();
echo "Demo account: {$email} / {$password}\n";
