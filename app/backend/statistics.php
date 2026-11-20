<?php
// Статистика за период: калории и БЖУ по дням, число тренировок и подходов, цели пользователя.

// Цель из профиля числом или null, если цель не задана.
// MySQL отдаёт DECIMAL строкой "160.00", поэтому переводим в число.
function goal_number($value)
{
    if ($value === null) {
        return null;
    }
    return $value + 0;
}

function user_statistics($user, $params)
{
    // Период из адреса ?from=2026-11-01&to=2026-11-20. Без него — последние 30 дней.
    $from = $params['from'] ?? date('Y-m-d', strtotime('-29 days'));
    $to = $params['to'] ?? date('Y-m-d');
    $from = date_value(['from' => $from], 'from');
    $to = date_value(['to' => $to], 'to');
    $dayCount = (strtotime($to) - strtotime($from)) / 86400; // 86400 секунд в сутках
    if ($from > $to || $dayCount > 365) {
        invalid('period', 'Выберите период не длиннее года, с началом до окончания.');
    }

    // Пустой день: ничего не съедено, тренировок нет. Заводим так каждый день периода,
    // чтобы на графике не было пропусков.
    $days = [];
    for ($date = $from; $date <= $to; $date = date('Y-m-d', strtotime($date . ' +1 day'))) {
        $days[$date] = ['date' => $date, 'calories' => 0.0, 'protein' => 0.0, 'fat' => 0.0, 'carbs' => 0.0,
            'workouts' => 0, 'exercises' => 0, 'sets' => 0];
    }

    // КБЖУ по дням: SUM складывает граммы * КБЖУ на 100 г / 100 по всем продуктам дня.
    $nutritionRows = query('SELECT m.meal_date,
            SUM(mi.quantity_g * mi.calories_snapshot / 100) AS calories,
            SUM(mi.quantity_g * mi.protein_snapshot / 100) AS protein,
            SUM(mi.quantity_g * mi.fat_snapshot / 100) AS fat,
            SUM(mi.quantity_g * mi.carbs_snapshot / 100) AS carbs
        FROM meals m
        JOIN meal_items mi ON mi.meal_id = m.id
        WHERE m.user_id = ? AND m.meal_date BETWEEN ? AND ?
        GROUP BY m.meal_date', [$user['id'], $from, $to])->fetchAll();
    foreach ($nutritionRows as $row) {
        $date = $row['meal_date'];
        $days[$date]['calories'] = round($row['calories'], 2);
        $days[$date]['protein'] = round($row['protein'], 2);
        $days[$date]['fat'] = round($row['fat'], 2);
        $days[$date]['carbs'] = round($row['carbs'], 2);
    }

    // Тренировки по дням: сколько тренировок, упражнений и подходов.
    // DISTINCT — считать каждую тренировку и упражнение один раз, а не по числу подходов.
    $workoutRows = query('SELECT w.workout_date,
            COUNT(DISTINCT w.id) AS workouts,
            COUNT(DISTINCT we.id) AS exercises,
            COUNT(ws.id) AS sets
        FROM workouts w
        LEFT JOIN workout_exercises we ON we.workout_id = w.id
        LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id
        WHERE w.user_id = ? AND w.workout_date BETWEEN ? AND ?
        GROUP BY w.workout_date', [$user['id'], $from, $to])->fetchAll();
    foreach ($workoutRows as $row) {
        $date = $row['workout_date'];
        $days[$date]['workouts'] = (int) $row['workouts'];
        $days[$date]['exercises'] = (int) $row['exercises'];
        $days[$date]['sets'] = (int) $row['sets'];
    }

    // Итог за весь период. Складываем точные суммы из базы и округляем один раз в конце.
    $totals = ['calories' => 0, 'protein' => 0, 'fat' => 0, 'carbs' => 0, 'workouts' => 0, 'sets' => 0];
    foreach ($nutritionRows as $row) {
        $totals['calories'] += $row['calories'];
        $totals['protein'] += $row['protein'];
        $totals['fat'] += $row['fat'];
        $totals['carbs'] += $row['carbs'];
    }
    foreach ($workoutRows as $row) {
        $totals['workouts'] += $row['workouts'];
        $totals['sets'] += $row['sets'];
    }
    $totals['calories'] = round($totals['calories'], 2);
    $totals['protein'] = round($totals['protein'], 2);
    $totals['fat'] = round($totals['fat'], 2);
    $totals['carbs'] = round($totals['carbs'], 2);

    return [
        'from' => $from,
        'to' => $to,
        'goals' => [
            'calories' => goal_number($user['target_calories']),
            'protein' => goal_number($user['target_protein_g']),
            'fat' => goal_number($user['target_fat_g']),
            'carbs' => goal_number($user['target_carbs_g']),
        ],
        'totals' => $totals,
        'days' => array_values($days), // нужен простой список дней, без ключей-дат
    ];
}
