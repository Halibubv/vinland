<?php
// Тренировки. Как это лежит в базе:
//   workouts          — тренировка: пользователь, дата, заметка;
//   workout_exercises — упражнения тренировки по порядку (position = 1, 2, 3...);
//   workout_sets      — подходы упражнения: повторения и вес.

// Тренировка со всеми упражнениями и подходами. Ищем сразу по id и владельцу:
// чужую тренировку пользователь не увидит, ответ будет как для несуществующей (404).
function find_workout($workoutId, $userId)
{
    $workout = query('SELECT id, workout_date, notes, created_at FROM workouts WHERE id = ? AND user_id = ?',
        [$workoutId, $userId])->fetch();
    if (!$workout) {
        send_error(404, 'Тренировка не найдена.');
    }

    $exercises = query('SELECT we.id, we.exercise_id, we.position, we.notes, e.name AS exercise_name, e.muscle_group, e.image
        FROM workout_exercises we
        JOIN exercises e ON e.id = we.exercise_id
        WHERE we.workout_id = ?
        ORDER BY we.position', [$workoutId])->fetchAll();

    // Подходы для каждого упражнения. & — меняем сам элемент массива, а не его копию.
    foreach ($exercises as &$exercise) {
        $exercise['sets'] = query('SELECT id, set_number, repetitions, weight_kg, notes FROM workout_sets
            WHERE workout_exercise_id = ? ORDER BY set_number', [$exercise['id']])->fetchAll();
    }
    unset($exercise);

    $workout['exercises'] = $exercises;
    return $workout;
}

// Все тренировки пользователя, новые сверху.
function list_workouts($userId)
{
    $rows = query('SELECT id FROM workouts WHERE user_id = ? ORDER BY workout_date DESC, id DESC', [$userId])->fetchAll();
    $workouts = [];
    foreach ($rows as $row) {
        $workouts[] = find_workout($row['id'], $userId);
    }
    return $workouts;
}

// Проверяем форму тренировки и возвращаем чистые данные.
function workout_input($data)
{
    $exercises = [];
    foreach (list_value($data, 'exercises', 'Передайте список упражнений.') as $item) {
        $sets = [];
        foreach (list_value($item, 'sets', 'Передайте список подходов.') as $set) {
            $sets[] = [
                'repetitions' => whole_number_value($set, 'repetitions', 1000),
                'weight_kg' => number_value($set, 'weight_kg', 10000),
                'notes' => optional_text_value($set, 'notes', 500),
            ];
        }
        $exercises[] = [
            'exercise_id' => id_value($item, 'exercise_id'),
            'notes' => optional_text_value($item, 'notes', 2000),
            'sets' => $sets,
        ];
    }
    if (count($exercises) === 0) {
        invalid('exercises', 'Добавьте хотя бы одно упражнение.');
    }

    return [
        'workout_date' => past_date_value($data, 'workout_date'),
        'notes' => optional_text_value($data, 'notes', 4000),
        'exercises' => $exercises,
    ];
}

// Сохранить тренировку: без $workoutId — новая, с $workoutId — правка.
function save_workout($userId, $data, $workoutId = null)
{
    $input = workout_input($data);

    // Какие упражнения уже были в тренировке до правки.
    $oldExerciseIds = [];
    if ($workoutId !== null) {
        find_workout($workoutId, $userId); // 404, если тренировка чужая или её нет
        $rows = query('SELECT exercise_id FROM workout_exercises WHERE workout_id = ?', [$workoutId])->fetchAll();
        foreach ($rows as $row) {
            $oldExerciseIds[] = $row['exercise_id'];
        }
    }

    // Сначала проверяем все упражнения, пока в базе ещё ничего не поменяли.
    // Подходит общее упражнение или своё упражнение этого пользователя. Отключённое
    // упражнение можно оставить в старой тренировке, но нельзя выбрать заново.
    foreach ($input['exercises'] as $exercise) {
        $found = query('SELECT is_active FROM exercises WHERE id = ? AND (user_id IS NULL OR user_id = ?)',
            [$exercise['exercise_id'], $userId])->fetch();
        $wasInWorkout = in_array($exercise['exercise_id'], $oldExerciseIds);
        if (!$found || ($found['is_active'] == 0 && !$wasInWorkout)) {
            invalid('exercises', 'Выберите активное упражнение из справочника.');
        }
    }

    // Записываем. Транзакция: либо сохранится всё, либо (если база упадёт посередине) ничего.
    $db = database();
    $db->beginTransaction();

    if ($workoutId === null) {
        $workoutId = insert('INSERT INTO workouts (user_id, workout_date, notes) VALUES (?, ?, ?)',
            [$userId, $input['workout_date'], $input['notes']]);
    } else {
        query('UPDATE workouts SET workout_date = ?, notes = ? WHERE id = ?',
            [$input['workout_date'], $input['notes'], $workoutId]);
        // Старые упражнения удаляем и записываем список заново. Их подходы удалит
        // сама база (ON DELETE CASCADE в схеме).
        query('DELETE FROM workout_exercises WHERE workout_id = ?', [$workoutId]);
    }

    $position = 1;
    foreach ($input['exercises'] as $exercise) {
        $workoutExerciseId = insert('INSERT INTO workout_exercises (workout_id, exercise_id, position, notes) VALUES (?, ?, ?, ?)',
            [$workoutId, $exercise['exercise_id'], $position, $exercise['notes']]);
        $position++;

        $setNumber = 1;
        foreach ($exercise['sets'] as $set) {
            query('INSERT INTO workout_sets (workout_exercise_id, set_number, repetitions, weight_kg, notes) VALUES (?, ?, ?, ?, ?)',
                [$workoutExerciseId, $setNumber, $set['repetitions'], $set['weight_kg'], $set['notes']]);
            $setNumber++;
        }
    }

    $db->commit();
    return find_workout($workoutId, $userId);
}

function delete_workout($workoutId, $userId)
{
    find_workout($workoutId, $userId); // 404, если тренировка чужая или её нет
    // Упражнения и подходы удалятся вместе с тренировкой (ON DELETE CASCADE).
    query('DELETE FROM workouts WHERE id = ?', [$workoutId]);
}
