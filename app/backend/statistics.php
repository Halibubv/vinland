<?php
// Статистика за период: калории и БЖУ по дням, число тренировок и подходов, цели пользователя.
declare(strict_types=1);

const NUTRIENTS = ['calories', 'protein', 'fat', 'carbs'];

// Период из ?from=...&to=...; по умолчанию последние 30 дней, включая сегодня.
function statistics_period(array $params): array
{
    $today = new DateTimeImmutable('today');
    $from = $params['from'] ?? $today->modify('-29 days')->format('Y-m-d');
    $to = $params['to'] ?? $today->format('Y-m-d');
    $from = date_value(['from' => $from], 'from');
    $to = date_value(['to' => $to], 'to');

    $start = new DateTimeImmutable($from);
    $end = new DateTimeImmutable($to);
    if ($start > $end || $start->diff($end)->days > 365) {
        invalid('period', 'Выберите период не длиннее года, с началом до окончания.');
    }
    return [$start, $end];
}

// Цель может быть не задана — тогда в ответе null.
function goal_value(mixed $value, bool $integer): int|float|null
{
    if ($value === null) {
        return null;
    }
    if ($integer) {
        return (int) $value;
    }
    return (float) $value;
}

function user_statistics(array $user, array $params): never
{
    [$start, $end] = statistics_period($params);
    $from = $start->format('Y-m-d');
    $to = $end->format('Y-m-d');

    // КБЖУ за каждый день, где были приёмы пищи. Граммы * значение на 100 г / 100.
    $nutritionRows = query('SELECT m.meal_date,
        COALESCE(SUM(mi.quantity_g * mi.calories_snapshot / 100), 0) AS calories,
        COALESCE(SUM(mi.quantity_g * mi.protein_snapshot / 100), 0) AS protein,
        COALESCE(SUM(mi.quantity_g * mi.fat_snapshot / 100), 0) AS fat,
        COALESCE(SUM(mi.quantity_g * mi.carbs_snapshot / 100), 0) AS carbs
        FROM meals m LEFT JOIN meal_items mi ON mi.meal_id = m.id
        WHERE m.user_id = ? AND m.meal_date BETWEEN ? AND ? GROUP BY m.meal_date',
        [$user['id'], $from, $to])->fetchAll();

    // Тренировки, упражнения и подходы за каждый день, где были тренировки.
    $workoutRows = query('SELECT w.workout_date, COUNT(DISTINCT w.id) AS workouts,
        COUNT(DISTINCT we.id) AS exercises, COUNT(ws.id) AS sets
        FROM workouts w LEFT JOIN workout_exercises we ON we.workout_id = w.id
        LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id
        WHERE w.user_id = ? AND w.workout_date BETWEEN ? AND ? GROUP BY w.workout_date',
        [$user['id'], $from, $to])->fetchAll();

    // Собираем данные по датам и параллельно считаем итог за весь период.
    $byDate = [];
    $totals = ['calories' => 0.0, 'protein' => 0.0, 'fat' => 0.0, 'carbs' => 0.0, 'workouts' => 0, 'sets' => 0];
    foreach ($nutritionRows as $row) {
        $date = $row['meal_date'];
        $byDate[$date] = [];
        foreach (NUTRIENTS as $nutrient) {
            $value = (float) $row[$nutrient];
            $totals[$nutrient] += $value;
            $byDate[$date][$nutrient] = round($value, 2);
        }
    }
    foreach ($workoutRows as $row) {
        $date = $row['workout_date'];
        $byDate[$date]['workouts'] = (int) $row['workouts'];
        $byDate[$date]['exercises'] = (int) $row['exercises'];
        $byDate[$date]['sets'] = (int) $row['sets'];
        $totals['workouts'] += (int) $row['workouts'];
        $totals['sets'] += (int) $row['sets'];
    }
    foreach (NUTRIENTS as $nutrient) {
        $totals[$nutrient] = round($totals[$nutrient], 2);
    }

    // В ответе есть каждый день периода, даже пустой, чтобы график не имел пропусков.
    $days = [];
    for ($date = $start; $date <= $end; $date = $date->modify('+1 day')) {
        $key = $date->format('Y-m-d');
        $day = ['date' => $key, 'calories' => 0.0, 'protein' => 0.0, 'fat' => 0.0, 'carbs' => 0.0,
            'workouts' => 0, 'exercises' => 0, 'sets' => 0];
        if (isset($byDate[$key])) {
            $day = array_merge($day, $byDate[$key]);
        }
        $days[] = $day;
    }

    respond([
        'from' => $from,
        'to' => $to,
        'goals' => [
            'calories' => goal_value($user['target_calories'], true),
            'protein' => goal_value($user['target_protein_g'], false),
            'fat' => goal_value($user['target_fat_g'], false),
            'carbs' => goal_value($user['target_carbs_g'], false),
        ],
        'totals' => $totals,
        'days' => $days,
    ]);
}
