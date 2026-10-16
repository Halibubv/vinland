<?php
declare(strict_types=1);
require dirname(__DIR__) . '/backend/bootstrap.php';

$checks = 0;
function history_check(bool $condition, string $name): void
{
    global $checks;
    if (!$condition) {
        throw new RuntimeException($name);
    }
    $checks++;
}

$suffix = bin2hex(random_bytes(6));
$userId = (int) query('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?) RETURNING id', [
    'history-' . $suffix . '@example.test', password_hash('CorrectHorse42', PASSWORD_DEFAULT), 'История',
])->fetchColumn();
$exerciseId = (int) query('INSERT INTO exercises (name) VALUES (?) RETURNING id', ['Историческое упражнение ' . $suffix])->fetchColumn();
$created = write_workout($userId, [
    'workout_date' => '2026-10-09', 'notes' => 'Исходная заметка',
    'exercises' => [[
        'exercise_id' => $exerciseId, 'notes' => 'Старая техника',
        'sets' => [['repetitions' => 8, 'weight_kg' => 50, 'notes' => null]],
    ]],
]);
query('UPDATE exercises SET is_active = FALSE WHERE id = ?', [$exerciseId]);

$updated = write_workout($userId, [
    'workout_date' => '2026-10-10', 'notes' => 'Исправленная заметка',
    'exercises' => [[
        'exercise_id' => $exerciseId, 'notes' => 'Исправленная техника',
        'sets' => [['repetitions' => 9, 'weight_kg' => 52.5, 'notes' => 'Контроль']],
    ]],
], (int) $created['id']);
history_check($updated['notes'] === 'Исправленная заметка', 'Inactive exercise keeps editable workout');
history_check(count($updated['exercises']) === 1 && (int) $updated['exercises'][0]['exercise_id'] === $exerciseId, 'Inactive exercise remains in history');
history_check((int) $updated['exercises'][0]['sets'][0]['repetitions'] === 9, 'Sets remain editable for inactive exercise');

try {
    write_workout($userId, [
        'workout_date' => '2026-10-11', 'notes' => 'Не должно сохраниться',
        'exercises' => [
            ['exercise_id' => $exerciseId, 'notes' => null, 'sets' => []],
            ['exercise_id' => $exerciseId, 'notes' => null, 'sets' => []],
        ],
    ], (int) $created['id']);
    throw new RuntimeException('Inactive exercise was added as a new occurrence');
} catch (ApiError $error) {
    history_check($error->status === 422 && isset($error->fields['exercises']), 'Inactive new occurrence rejected');
}
$afterFailure = workout_payload((int) $created['id'], $userId);
history_check($afterFailure['notes'] === 'Исправленная заметка' && count($afterFailure['exercises']) === 1, 'Failed edit rolls back fully');
echo 'Workout history checks passed: ' . $checks . " checks\n";
