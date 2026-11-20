<?php
// Регистрация, вход, выход и проверка, кто сейчас вошёл.
// Кто вошёл, хранится в сессии PHP: $_SESSION['user_id']. Сама сессия — это файл
// на сервере, а браузер хранит только его номер в cookie vinland_session.

// Данные вошедшего пользователя или null, если никто не вошёл.
// Пароль (password_hash) наружу не отдаём.
function current_user()
{
    if (!isset($_SESSION['user_id'])) {
        return null;
    }
    $user = query('SELECT id, email, name, role, target_calories, target_protein_g,
        target_fat_g, target_carbs_g, avatar FROM users WHERE id = ?', [$_SESSION['user_id']])->fetch();
    if (!$user) {
        return null;
    }
    return $user;
}

// Для страниц только для вошедших: возвращает пользователя или отвечает ошибкой 401.
function require_user()
{
    $user = current_user();
    if (!$user) {
        send_error(401, 'Войдите в аккаунт.');
    }
    return $user;
}

// Для админки: пользователь должен быть вошедшим и с ролью admin.
function require_admin()
{
    $user = require_user();
    if ($user['role'] !== 'admin') {
        send_error(403, 'Этот раздел доступен только администратору.');
    }
    return $user;
}

function register($data)
{
    $email = email_value($data);
    $name = text_value($data, 'name', 100);
    $password = password_value($data);

    $exists = query('SELECT id FROM users WHERE email = ?', [$email])->fetch();
    if ($exists) {
        invalid('email', 'Этот email уже зарегистрирован.');
    }

    // В базе хранится не сам пароль, а его хэш. Роль не указываем: по умолчанию 'user'.
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $id = insert('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)', [$email, $hash, $name]);

    // Новый номер сессии при входе, чтобы старый номер нельзя было подсунуть.
    session_regenerate_id(true);
    $_SESSION['user_id'] = $id;
    return current_user();
}

function login($data)
{
    $email = email_value($data);
    $password = password_value($data);

    $user = query('SELECT id, password_hash FROM users WHERE email = ?', [$email])->fetch();
    // password_verify сравнивает введённый пароль с хэшем из базы.
    if (!$user || !password_verify($password, $user['password_hash'])) {
        send_error(401, 'Неверный email или пароль.');
    }

    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['id'];
    return current_user();
}

function logout()
{
    $_SESSION = [];
    session_regenerate_id(true);
}
