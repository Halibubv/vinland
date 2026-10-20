<?php
// Тренировки: упражнения в заданном порядке и подходы (повторения, вес, заметки).
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
    if (count($exercises) === 0) {
        invalid('exercises', 'Добавьте хотя бы одно упражнение.');
    }
    return [
        'workout_date' => date_value($data, 'workout_date'),
        'notes' => optional_text_value($data, 'notes', 4000),
        'exercises' => $exercises,
    ];
}

// Тренировку ищем сразу по id и владельцу: чужая выглядит так же, как несуществующая.
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
    $exercises = query('SELECT we.id, we.exercise_id, we.position, we.notes, e.name AS exercise_name, e.muscle_group
        FROM workout_exercises we JOIN exercises e ON e.id = we.exercise_id
        WHERE we.workout_id = ? ORDER BY we.position', [$workoutId])->fetchAll();
    foreach ($exercises as $index => $exercise) {
        $exercises[$index]['sets'] = query('SELECT id, set_number, repetitions, weight_kg, notes
            FROM workout_sets WHERE workout_exercise_id = ? ORDER BY set_number', [$exercise['id']])->fetchAll();
    }
    $workout['exercises'] = $exercises;
    return $workout;
}

// MySQL хранит BOOLEAN как число: 1 — активно, 0 — отключено.
function active_catalog_value(mixed $value): bool
{
    return (int) $value === 1;
}

// Создаёт тренировку ($workoutId = null) или перезаписывает упражнения существующей.
// Всё в одной транзакции: при любой ошибке в базе ничего не меняется.
function write_workout(int $userId, array $input, ?int $workoutId = null): array
{
    $db = database();
    $db->beginTransaction();
    try {
        // Сколько раз каждое упражнение уже было в этой тренировке до правки.
        $countsBefore = [];
        if ($workoutId === null) {
            $workoutId = insert('INSERT INTO workouts (user_id, workout_date, notes) VALUES (?, ?, ?)', [
                $userId, $input['workout_date'], $input['notes'],
            ]);
        } else {
            owned_workout($workoutId, $userId, true);
            $rows = query('SELECT exercise_id, COUNT(*) AS occurrences FROM workout_exercises
                WHERE workout_id = ? GROUP BY exercise_id', [$workoutId])->fetchAll();
            foreach ($rows as $row) {
                $countsBefore[(int) $row['exercise_id']] = (int) $row['occurrences'];
            }
            query('UPDATE workouts SET workout_date = ?, notes = ? WHERE id = ?', [
                $input['workout_date'], $input['notes'], $workoutId,
            ]);
            // Упражнения и подходы проще записать заново; подходы удалятся каскадом.
            query('DELETE FROM workout_exercises WHERE workout_id = ?', [$workoutId]);
        }

        $countsNow = [];
        foreach ($input['exercises'] as $position => $exercise) {
            $exerciseId = $exercise['exercise_id'];
            $catalogExercise = query('SELECT is_active FROM exercises WHERE id = ?', [$exerciseId])->fetch();
            if (!$catalogExercise) {
                invalid('exercises', 'Выберите активное упражнение из справочника.');
            }

            // Отключённое упражнение можно оставить в старой тренировке,
            // но нельзя добавить ещё раз сверх того, что уже было.
            $countsNow[$exerciseId] = ($countsNow[$exerciseId] ?? 0) + 1;
            $isActive = active_catalog_value($catalogExercise['is_active']);
            $wasThereBefore = $countsNow[$exerciseId] <= ($countsBefore[$exerciseId] ?? 0);
            if (!$isActive && !$wasThereBefore) {
                invalid('exercises', 'Выберите активное упражнение из справочника.');
            }

            $workoutExerciseId = insert('INSERT INTO workout_exercises (workout_id, exercise_id, position, notes)
                VALUES (?, ?, ?, ?)', [$workoutId, $exerciseId, $position + 1, $exercise['notes']]);
            foreach ($exercise['sets'] as $setIndex => $set) {
                query('INSERT INTO workout_sets (workout_exercise_id, set_number, repetitions, weight_kg, notes)
                    VALUES (?, ?, ?, ?, ?)', [$workoutExerciseId, $setIndex + 1, $set['repetitions'], $set['weight_kg'], $set['notes']]);
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
    $workouts = [];
    foreach ($rows as $row) {
        $workouts[] = workout_payload((int) $row['id'], $userId);
    }
    respond(['workouts' => $workouts]);
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
