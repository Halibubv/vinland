<?php
// Точка входа: сюда приходит каждый запрос, кроме готовых файлов (картинки, стили, скрипты).
// Ниже — список маршрутов: метод (GET, POST, PUT, DELETE) + адрес → что сделать.
// Подходящий маршрут отправляет ответ через respond(), и на этом скрипт заканчивается.
require __DIR__ . '/../backend/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// --- Страницы сайта ---
// Все страницы рисует React, поэтому на любой адрес страницы отдаём один и тот же
// собранный файл ui/index.html, а React уже сам смотрит на адрес и показывает нужный экран.
function send_page($status = 200)
{
    $file = __DIR__ . '/ui/index.html';
    if (!is_file($file)) {
        send_error(503, 'Интерфейс ещё не собран. Выполните pnpm run build.');
    }
    http_response_code($status);
    header('Content-Type: text/html; charset=utf-8');
    readfile($file);
    exit;
}

$pages = ['/', '/login', '/register', '/profile', '/workouts', '/workouts/new',
    '/nutrition', '/nutrition/new', '/nutrition/history', '/statistics', '/admin/exercises', '/admin/products', '/admin/users'];
$isPage = in_array($path, $pages)
    || preg_match('#^/(workouts|nutrition)/\d+$#', $path)   // /workouts/5, /nutrition/7
    || preg_match('#^/workouts/\d+/edit$#', $path);          // /workouts/5/edit
if ($method === 'GET' && $isPage) {
    send_page();
}

// Проверка для хостинга Render: сервер работает и база отвечает.
if ($method === 'GET' && $path === '/api/health') {
    query('SELECT 1');
    respond(['status' => 'ok']);
}

// --- Вход и регистрация ---
if ($method === 'GET' && $path === '/api/session') {
    respond(['user' => current_user()]);
}
if ($method === 'POST' && $path === '/api/auth/register') {
    respond(['user' => register(read_json())], 201);
}
if ($method === 'POST' && $path === '/api/auth/login') {
    respond(['user' => login(read_json())]);
}
if ($method === 'POST' && $path === '/api/auth/logout') {
    logout();
    respond(['user' => null]);
}

// --- Профиль ---
if ($method === 'GET' && $path === '/api/profile') {
    respond(['user' => require_user()]);
}
if ($method === 'PUT' && $path === '/api/profile') {
    $user = require_user();
    update_profile($user['id'], read_json());
    respond(['user' => current_user()]);
}
if ($method === 'PUT' && $path === '/api/profile/avatar') {
    $user = require_user();
    update_avatar($user['id'], read_json());
    respond(['user' => current_user()]);
}

// --- Статистика ---
if ($method === 'GET' && $path === '/api/statistics') {
    $user = require_user();
    respond(user_statistics($user, $_GET));
}

// --- Справочники для пользователя ---
if ($method === 'GET' && $path === '/api/exercises') {
    $user = require_user();
    respond(['exercises' => list_exercises($user['id'])]);
}
if ($method === 'POST' && $path === '/api/exercises') {
    $user = require_user();
    respond(['exercise' => create_own_exercise($user['id'], read_json())], 201);
}
if ($method === 'GET' && $path === '/api/products') {
    $user = require_user();
    respond(['products' => list_products($user['id'])]);
}
if ($method === 'POST' && $path === '/api/products') {
    $user = require_user();
    respond(['product' => create_own_product($user['id'], read_json())], 201);
}

// --- Тренировки ---
if ($method === 'GET' && $path === '/api/workouts') {
    $user = require_user();
    respond(['workouts' => list_workouts($user['id'])]);
}
if ($method === 'POST' && $path === '/api/workouts') {
    $user = require_user();
    respond(['workout' => save_workout($user['id'], read_json())], 201);
}
// Адрес с номером: /api/workouts/5. preg_match кладёт найденный номер в $match[1].
if (preg_match('#^/api/workouts/(\d+)$#', $path, $match)) {
    $user = require_user();
    $id = (int) $match[1];
    if ($method === 'GET') {
        respond(['workout' => find_workout($id, $user['id'])]);
    }
    if ($method === 'PUT') {
        respond(['workout' => save_workout($user['id'], read_json(), $id)]);
    }
    if ($method === 'DELETE') {
        delete_workout($id, $user['id']);
        respond(['deleted' => true]);
    }
}

// --- Питание ---
if ($method === 'GET' && $path === '/api/meals') {
    $user = require_user();
    $date = null;
    if (isset($_GET['date'])) {
        $date = date_value($_GET, 'date'); // ?date=2026-11-20 — только этот день
    }
    respond(['meals' => list_meals($user['id'], $date)]);
}
if ($method === 'POST' && $path === '/api/meals') {
    $user = require_user();
    respond(['meal' => save_meal($user['id'], read_json())], 201);
}
if (preg_match('#^/api/meals/(\d+)$#', $path, $match)) {
    $user = require_user();
    $id = (int) $match[1];
    if ($method === 'GET') {
        respond(['meal' => find_meal($id, $user['id'])]);
    }
    if ($method === 'PUT') {
        respond(['meal' => save_meal($user['id'], read_json(), $id)]);
    }
    if ($method === 'DELETE') {
        delete_meal($id, $user['id']);
        respond(['deleted' => true]);
    }
}

// --- Демо-режим ---
// На публичном демо (DEMO_MODE=1) пароль администратора известен всем: он написан
// в README. Поэтому там админку можно только смотреть: справочники, пользователей
// и загрузку картинок менять нельзя.
if (config('DEMO_MODE') === '1' && str_starts_with($path, '/api/admin/') && $method !== 'GET') {
    require_admin();
    send_error(403, 'Это демо: в админке можно всё посмотреть, но изменения отключены.');
}

// --- Админка справочников ---
if ($method === 'GET' && $path === '/api/admin/exercises') {
    require_admin();
    respond(['exercises' => admin_list_exercises()]);
}
if ($method === 'POST' && $path === '/api/admin/exercises') {
    require_admin();
    respond(['exercise' => admin_save_exercise(read_json())], 201);
}
if ($method === 'PUT' && preg_match('#^/api/admin/exercises/(\d+)$#', $path, $match)) {
    require_admin();
    respond(['exercise' => admin_save_exercise(read_json(), (int) $match[1])]);
}
if ($method === 'GET' && $path === '/api/admin/products') {
    require_admin();
    respond(['products' => admin_list_products()]);
}
if ($method === 'POST' && $path === '/api/admin/products') {
    require_admin();
    respond(['product' => admin_save_product(read_json())], 201);
}
if ($method === 'PUT' && preg_match('#^/api/admin/products/(\d+)$#', $path, $match)) {
    require_admin();
    respond(['product' => admin_save_product(read_json(), (int) $match[1])]);
}

// Картинка записи справочника: PUT /api/admin/exercises/5/image или /api/admin/products/5/image.
if ($method === 'PUT' && preg_match('#^/api/admin/(exercises|products)/(\d+)/image$#', $path, $match)) {
    require_admin();
    admin_save_image($match[1], (int) $match[2], read_json());
    if ($match[1] === 'exercises') {
        respond(['exercise' => admin_find_exercise((int) $match[2])]);
    }
    respond(['product' => admin_find_product((int) $match[2])]);
}

// --- Админка: панель со статистикой и пользователи ---
if ($method === 'GET' && $path === '/api/admin/users') {
    require_admin();
    respond(admin_dashboard());
}
if ($method === 'PUT' && preg_match('#^/api/admin/users/(\d+)$#', $path, $match)) {
    $admin = require_admin();
    admin_set_role($admin, (int) $match[1], read_json());
    respond(admin_dashboard());
}
if ($method === 'DELETE' && preg_match('#^/api/admin/users/(\d+)$#', $path, $match)) {
    $admin = require_admin();
    admin_delete_user($admin, (int) $match[1]);
    respond(admin_dashboard());
}

// --- Ни один маршрут не подошёл ---
// Для адреса страницы отдаём сайт с кодом 404: React сам покажет «Страница не найдена».
// Для адреса API — ошибку в JSON.
if ($method === 'GET' && !str_starts_with($path, '/api/')) {
    send_page(404);
}
send_error(404, 'Страница не найдена.');
