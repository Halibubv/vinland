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

    $ip = client_ip();
    check_login_limit($email, $ip);

    $user = query('SELECT id, password_hash FROM users WHERE email = ?', [$email])->fetch();
    // password_verify сравнивает введённый пароль с хэшем из базы.
    if (!$user || !password_verify($password, $user['password_hash'])) {
        query('INSERT INTO login_attempts (email, ip) VALUES (?, ?)', [$email, $ip]);
        send_error(401, 'Неверный email или пароль.');
    }

    // Вход удался: неудачные попытки с этого адреса для этого email больше не считаем.
    query('DELETE FROM login_attempts WHERE email = ? AND ip = ?', [$email, $ip]);
    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['id'];
    return current_user();
}

// --- Защита от подбора пароля ---
// За 15 минут: не больше 5 неудачных попыток на пару «email + адрес посетителя»
// и не больше 20 с одного адреса. Пара, а не один email, — чтобы чужие ошибки
// не закрыли вход в общий демо-аккаунт для всех остальных.
function check_login_limit($email, $ip)
{
    // Старые записи больше не нужны.
    query('DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL 15 MINUTE');

    $byPair = query('SELECT COUNT(*) FROM login_attempts WHERE email = ? AND ip = ?', [$email, $ip])->fetchColumn();
    $byIp = query('SELECT COUNT(*) FROM login_attempts WHERE ip = ?', [$ip])->fetchColumn();
    if ($byPair >= 5 || $byIp >= 20) {
        header('Retry-After: 900');
        send_error(429, 'Слишком много попыток входа. Подождите 15 минут и попробуйте снова.');
    }
}

// Адрес посетителя. На Render перед приложением стоит прокси, и REMOTE_ADDR у всех
// одинаковый. Тогда (TRUST_PROXY=1) берём последний адрес из X-Forwarded-For —
// его дописал сам прокси, подделать его посетитель не может.
function client_ip()
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    if (config('TRUST_PROXY') === '1' && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $chain = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $last = trim(end($chain));
        if (filter_var($last, FILTER_VALIDATE_IP)) {
            $ip = $last;
        }
    }
    return substr($ip, 0, 45);
}

function logout()
{
    $_SESSION = [];
    session_regenerate_id(true);
}
