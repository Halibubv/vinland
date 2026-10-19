<?php
declare(strict_types=1);

function statistics_period(array $params): array
{
    $today = new DateTimeImmutable('today');
    $from = date_value(['from' => $params['from'] ?? $today->modify('-29 days')->format('Y-m-d')], 'from');
    $to = date_value(['to' => $params['to'] ?? $today->format('Y-m-d')], 'to');
    $start = new DateTimeImmutable($from);
    $end = new DateTimeImmutable($to);
    $days = (int) $start->diff($end)->format('%r%a');
    if ($days < 0 || $days > 365) {
        invalid('period', 'Выберите период не длиннее года, с началом до окончания.');
    }
    return [$start, $end];
}

function user_statistics(array $user, array $params): never
{
    [$start, $end] = statistics_period($params);
    $from = $start->format('Y-m-d');
    $to = $end->format('Y-m-d');
    $nutrition = query('SELECT m.meal_date, COALESCE(SUM(mi.quantity_g * mi.calories_snapshot / 100), 0) AS calories,
        COALESCE(SUM(mi.quantity_g * mi.protein_snapshot / 100), 0) AS protein,
        COALESCE(SUM(mi.quantity_g * mi.fat_snapshot / 100), 0) AS fat,
        COALESCE(SUM(mi.quantity_g * mi.carbs_snapshot / 100), 0) AS carbs
        FROM meals m LEFT JOIN meal_items mi ON mi.meal_id = m.id
        WHERE m.user_id = ? AND m.meal_date BETWEEN ? AND ? GROUP BY m.meal_date',
        [$user['id'], $from, $to])->fetchAll();
    $workouts = query('SELECT w.workout_date, COUNT(DISTINCT w.id) AS workouts, COUNT(DISTINCT we.id) AS exercises, COUNT(ws.id) AS sets
        FROM workouts w LEFT JOIN workout_exercises we ON we.workout_id = w.id
        LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id
        WHERE w.user_id = ? AND w.workout_date BETWEEN ? AND ? GROUP BY w.workout_date',
        [$user['id'], $from, $to])->fetchAll();
    $byDate = [];
    $totals = ['calories' => 0.0, 'protein' => 0.0, 'fat' => 0.0, 'carbs' => 0.0, 'workouts' => 0, 'sets' => 0];
    foreach ($nutrition as $row) {
        $date = $row['meal_date'];
        $byDate[$date] = [];
        foreach (['calories', 'protein', 'fat', 'carbs'] as $field) {
            $raw = (float) $row[$field];
            $totals[$field] += $raw;
            $byDate[$date][$field] = round($raw, 2);
        }
    }
    foreach ($workouts as $row) {
        $byDate[$row['workout_date']]['workouts'] = (int) $row['workouts'];
        $byDate[$row['workout_date']]['exercises'] = (int) $row['exercises'];
        $byDate[$row['workout_date']]['sets'] = (int) $row['sets'];
        $totals['workouts'] += (int) $row['workouts'];
        $totals['sets'] += (int) $row['sets'];
    }
    $days = [];
    for ($date = $start; $date <= $end; $date = $date->modify('+1 day')) {
        $day = ['date' => $date->format('Y-m-d'), 'calories' => 0.0, 'protein' => 0.0,
            'fat' => 0.0, 'carbs' => 0.0, 'workouts' => 0, 'exercises' => 0, 'sets' => 0];
        $day = array_replace($day, $byDate[$day['date']] ?? []);
        $days[] = $day;
    }
    foreach (['calories', 'protein', 'fat', 'carbs'] as $field) {
        $totals[$field] = round($totals[$field], 2);
    }
    respond(['from' => $from, 'to' => $to, 'goals' => [
        'calories' => $user['target_calories'] === null ? null : (int) $user['target_calories'],
        'protein' => $user['target_protein_g'] === null ? null : (float) $user['target_protein_g'],
        'fat' => $user['target_fat_g'] === null ? null : (float) $user['target_fat_g'],
        'carbs' => $user['target_carbs_g'] === null ? null : (float) $user['target_carbs_g'],
    ], 'totals' => $totals, 'days' => $days]);
}
