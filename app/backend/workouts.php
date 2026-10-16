<?php
declare(strict_types=1);

function workout_input(array $data): array
{
    $items = $data['exercises'] ?? [];
    if (!is_array($items) || !array_is_list($items)) {
        invalid('exercises', 'Передайте список упражнений.');
    }
    $exercises = [];
    foreach ($items as $item) {
        if (!is_array($item)) {
            invalid('exercises', 'Упражнение указано некорректно.');
        }
        $sets = $item['sets'] ?? [];
        if (!is_array($sets) || !array_is_list($sets)) {
            invalid('sets', 'Передайте список подходов.');
        }
        $preparedSets = [];
        foreach ($sets as $set) {
            if (!is_array($set)) {
                invalid('sets', 'Подход указан некорректно.');
            }
            $preparedSets[] = [
                'repetitions' => number_value($set, 'repetitions', 1000, true),
                'weight_kg' => number_value($set, 'weight_kg', 10000),
                'notes' => optional_text_value($set, 'notes', 500),
            ];
        }
        $exercises[] = [
            'exercise_id' => id_value($item, 'exercise_id'),
            'notes' => optional_text_value($item, 'notes', 2000),
            'sets' => $preparedSets,
        ];
    }
    return [
        'workout_date' => date_value($data, 'workout_date'),
        'notes' => optional_text_value($data, 'notes', 4000),
        'exercises' => $exercises,
    ];
}

function owned_workout(int $workoutId, int $userId, bool $lock = false): array
{
    $sql = 'SELECT id, workout_date, notes, created_at FROM workouts WHERE id = ? AND user_id = ?';
    if ($lock) {
        $sql .= ' FOR UPDATE';
    }
    $workout = query($sql, [$workoutId, $userId])->fetch();
    if (!$workout) {
        throw new ApiError(404, 'Тренировка не найдена.');
    }
    return $workout;
}

function workout_payload(int $workoutId, int $userId): array
{
    $workout = owned_workout($workoutId, $userId);
    $exerciseRows = query('SELECT we.id, we.exercise_id, we.position, we.notes, e.name AS exercise_name
        FROM workout_exercises we JOIN exercises e ON e.id = we.exercise_id
        WHERE we.workout_id = ? ORDER BY we.position', [$workoutId])->fetchAll();
    $workout['exercises'] = array_map(function (array $exercise): array {
        $exercise['sets'] = query('SELECT id, set_number, repetitions, weight_kg, notes
            FROM workout_sets WHERE workout_exercise_id = ? ORDER BY set_number', [$exercise['id']])->fetchAll();
        return $exercise;
    }, $exerciseRows);
    return $workout;
}

function active_catalog_value(mixed $value): bool
{
    return $value === true || $value === 1 || $value === '1' || $value === 't';
}

function write_workout(int $userId, array $input, ?int $workoutId = null): array
{
    $db = database();
    $db->beginTransaction();
    try {
        $historicalCounts = [];
        if ($workoutId === null) {
            $workoutId = (int) query('INSERT INTO workouts (user_id, workout_date, notes) VALUES (?, ?, ?) RETURNING id', [
                $userId, $input['workout_date'], $input['notes'],
            ])->fetchColumn();
        } else {
            owned_workout($workoutId, $userId, true);
            foreach (query('SELECT exercise_id, COUNT(*) AS occurrences FROM workout_exercises WHERE workout_id = ? GROUP BY exercise_id', [$workoutId])->fetchAll() as $row) {
                $historicalCounts[(int) $row['exercise_id']] = (int) $row['occurrences'];
            }
            query('UPDATE workouts SET workout_date = ?, notes = ? WHERE id = ?', [
                $input['workout_date'], $input['notes'], $workoutId,
            ]);
            query('DELETE FROM workout_exercises WHERE workout_id = ?', [$workoutId]);
        }
        $incomingCounts = [];
        foreach ($input['exercises'] as $position => $exercise) {
            $catalogExercise = query('SELECT is_active FROM exercises WHERE id = ?', [$exercise['exercise_id']])->fetch();
            $incomingCounts[$exercise['exercise_id']] = ($incomingCounts[$exercise['exercise_id']] ?? 0) + 1;
            if (!$catalogExercise || (!active_catalog_value($catalogExercise['is_active'])
                && $incomingCounts[$exercise['exercise_id']] > ($historicalCounts[$exercise['exercise_id']] ?? 0))) {
                invalid('exercises', 'Выберите активное упражнение из справочника.');
            }
            $workoutExerciseId = (int) query('INSERT INTO workout_exercises (workout_id, exercise_id, position, notes)
                VALUES (?, ?, ?, ?) RETURNING id', [$workoutId, $exercise['exercise_id'], $position + 1, $exercise['notes']])->fetchColumn();
            foreach ($exercise['sets'] as $setNumber => $set) {
                query('INSERT INTO workout_sets (workout_exercise_id, set_number, repetitions, weight_kg, notes)
                    VALUES (?, ?, ?, ?, ?)', [$workoutExerciseId, $setNumber + 1, $set['repetitions'], $set['weight_kg'], $set['notes']]);
            }
        }
        $db->commit();
    } catch (Throwable $error) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        throw $error;
    }
    return workout_payload($workoutId, $userId);
}

function list_workouts(int $userId): never
{
    $rows = query('SELECT id FROM workouts WHERE user_id = ? ORDER BY workout_date DESC, id DESC', [$userId])->fetchAll();
    respond(['workouts' => array_map(fn (array $row): array => workout_payload((int) $row['id'], $userId), $rows)]);
}

function list_exercises(): never
{
    $exercises = query('SELECT id, name, muscle_group, description FROM exercises WHERE is_active = TRUE ORDER BY name, id')->fetchAll();
    respond(['exercises' => $exercises]);
}

function delete_workout(int $workoutId, int $userId): never
{
    $deleted = query('DELETE FROM workouts WHERE id = ? AND user_id = ?', [$workoutId, $userId]);
    if ($deleted->rowCount() !== 1) {
        throw new ApiError(404, 'Тренировка не найдена.');
    }
    respond(['deleted' => true]);
}
