<?php
declare(strict_types=1);
require dirname(__DIR__) . '/backend/bootstrap.php';
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// Serve only approved client-side routes from the built UI. All other paths,
// including private backend/database files, still fall through to API 404.
if (in_array($method, ['GET', 'HEAD'], true) && (
    in_array($path, ['/', '/login', '/register', '/profile', '/workouts', '/workouts/new', '/nutrition', '/nutrition/new', '/nutrition/history', '/statistics', '/admin/exercises', '/admin/products'], true)
    || preg_match('#^/(?:workouts|nutrition)/[1-9][0-9]*$#', $path)
    || preg_match('#^/workouts/[1-9][0-9]*/edit$#', $path)
)) {
    $entry = __DIR__ . '/ui/index.html';
    if (!is_file($entry)) {
        throw new ApiError(503, 'Интерфейс ещё не собран. Выполните pnpm run build.');
    }
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache');
    readfile($entry);
    exit;
}

if ($method === 'GET' && $path === '/api/session') {
    respond(['user' => current_user(), 'csrf' => $_SESSION['csrf']]);
}
if ($method === 'GET' && $path === '/api/health') {
    query('SELECT 1');
    respond(['status' => 'ok']);
}
if (!in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) {
    require_csrf();
}
if ($method === 'POST' && $path === '/api/auth/register') {
    register_account(read_json());
}
if ($method === 'POST' && $path === '/api/auth/login') {
    login_account(read_json());
}
if ($method === 'POST' && $path === '/api/auth/logout') {
    logout_account();
}
if ($method === 'GET' && $path === '/api/profile') {
    respond(['user' => require_user()]);
}
if ($method === 'PUT' && $path === '/api/profile') {
    $user = require_user();
    $data = read_json();
    $name = text_value($data, 'name', 100);
    $calories = number_value($data, 'target_calories', 100000, true, true, true);
    $protein = number_value($data, 'target_protein_g', 10000, false, true, true);
    $fat = number_value($data, 'target_fat_g', 10000, false, true, true);
    $carbs = number_value($data, 'target_carbs_g', 10000, false, true, true);
    query('UPDATE users SET name = ?, target_calories = ?, target_protein_g = ?, target_fat_g = ?, target_carbs_g = ? WHERE id = ?', [
        $name, $calories, $protein, $fat, $carbs, $user['id'],
    ]);
    respond(['user' => current_user()]);
}
if ($method === 'GET' && $path === '/api/statistics') {
    user_statistics(require_user(), $_GET);
}
if (preg_match('#^/api/admin/(exercises|products)(?:/(\d+))?$#', $path, $matches)) {
    require_user(true);
    $kind = $matches[1];
    $id = isset($matches[2]) ? (int) $matches[2] : null;
    if ($method === 'GET' && $id === null) {
        admin_catalog($kind);
    }
    if ($method === 'POST' && $id === null) {
        admin_write_catalog($kind, catalog_input($kind, read_json()));
    }
    if ($method === 'PUT' && $id !== null) {
        admin_write_catalog($kind, catalog_input($kind, read_json()), $id);
    }
}
if ($method === 'GET' && $path === '/api/exercises') {
    require_user();
    list_exercises();
}
if ($method === 'GET' && $path === '/api/products') {
    require_user();
    list_products();
}
if ($method === 'GET' && $path === '/api/meals') {
    $user = require_user();
    $date = isset($_GET['date']) ? date_value(['date' => $_GET['date']], 'date') : null;
    list_meals((int) $user['id'], $date);
}
if ($method === 'POST' && $path === '/api/meals') {
    $user = require_user();
    respond(['meal' => write_meal((int) $user['id'], meal_input(read_json()))], 201);
}
if (preg_match('#^/api/meals/(\d+)$#', $path, $matches)) {
    $mealId = (int) $matches[1];
    $user = require_user();
    if ($method === 'GET') {
        respond(['meal' => meal_payload($mealId, (int) $user['id'])]);
    }
    if ($method === 'PUT') {
        respond(['meal' => write_meal((int) $user['id'], meal_input(read_json()), $mealId)]);
    }
    if ($method === 'DELETE') {
        delete_meal($mealId, (int) $user['id']);
    }
}
if ($method === 'GET' && $path === '/api/workouts') {
    $user = require_user();
    list_workouts((int) $user['id']);
}
if ($method === 'POST' && $path === '/api/workouts') {
    $user = require_user();
    respond(['workout' => write_workout((int) $user['id'], workout_input(read_json()))], 201);
}
if (preg_match('#^/api/workouts/(\d+)$#', $path, $matches)) {
    $workoutId = (int) $matches[1];
    $user = require_user();
    if ($method === 'GET') {
        respond(['workout' => workout_payload($workoutId, (int) $user['id'])]);
    }
    if ($method === 'PUT') {
        respond(['workout' => write_workout((int) $user['id'], workout_input(read_json()), $workoutId)]);
    }
    if ($method === 'DELETE') {
        delete_workout($workoutId, (int) $user['id']);
    }
}
throw new ApiError(404, 'Страница не найдена.');
