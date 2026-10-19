<?php
declare(strict_types=1);
require dirname(__DIR__) . '/backend/http.php';
require dirname(__DIR__) . '/backend/validation.php';

$checks = 0;
function check(bool $condition, string $name): void
{
    global $checks;
    if (!$condition) {
        throw new RuntimeException($name);
    }
    $checks++;
}
function rejects(callable $action, string $field): void
{
    try {
        $action();
        throw new RuntimeException('Expected validation failure: ' . $field);
    } catch (ApiError $error) {
        check($error->status === 422 && isset($error->fields[$field]), $field);
    }
}

check(text_value(['name' => '  Алексей  '], 'name', 7) === 'Алексей', 'Unicode names');
rejects(fn () => text_value(['name' => 'Алексей'], 'name', 6), 'name');
rejects(fn () => text_value(['name' => []], 'name', 100), 'name');
check(email_value(['email' => 'Alexey@Example.COM']) === 'alexey@example.com', 'Email normalization');
check(password_value(['password' => 'CorrectHorse42']) === 'CorrectHorse42', 'Password accepts safe length');
rejects(fn () => password_value(['password' => str_repeat('a', 73)]), 'password');
rejects(fn () => password_value(['password' => "Correct\0Horse42"]), 'password');
check(number_value(['reps' => '0'], 'reps', 999, true) === 0, 'Zero repetitions allowed');
rejects(fn () => number_value(['reps' => '-1'], 'reps', 999, true), 'reps');
rejects(fn () => number_value(['reps' => '1.5'], 'reps', 999, true), 'reps');
rejects(fn () => number_value(['grams' => 0], 'grams', 999999, false, false, true), 'grams');
rejects(fn () => number_value(['grams' => true], 'grams', 999999), 'grams');
check(number_value(['target' => ''], 'target', 99999, false, true) === null, 'Empty target stays null');
rejects(fn () => date_value(['date' => '2026-02-30'], 'date'), 'date');
check(date_value(['date' => '2024-02-29'], 'date') === '2024-02-29', 'Leap day');
check(nutrition_totals([['quantity_g' => 150, 'calories_snapshot' => 200,
    'protein_snapshot' => 10, 'fat_snapshot' => 5, 'carbs_snapshot' => 20]])
    === ['calories' => 300.0, 'protein' => 15.0, 'fat' => 7.5, 'carbs' => 30.0], 'TZ nutrition example');
echo 'Passed ' . $checks . " checks\n";
