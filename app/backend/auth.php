<?php
// Регистрация, вход и выход, а также ограничение числа неверных попыток входа.
declare(strict_types=1);

const ACCOUNT_LOGIN_LIMIT = 5;
const IP_LOGIN_LIMIT = 20;

function client_ip(): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    // За прокси (например, на Render) REMOTE_ADDR — это адрес прокси, общий для всех.
    // Тогда настоящий адрес посетителя — первый в заголовке X-Forwarded-For.
    // Включается только явно через TRUST_PROXY=1: без прокси этот заголовок может подделать кто угодно.
    if (config('TRUST_PROXY', '0') === '1' && isset($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $addresses = explode(',', (string) $_SERVER['HTTP_X_FORWARDED_FOR']);
        $ip = trim($addresses[0]);
    }
    if (!is_string($ip) || $ip === '' || strlen($ip) > 45) {
        return 'unknown';
    }
    return $ip;
}

function establish_session(int $userId): void
{
    session_regenerate_id(true);
    $_SESSION = [
        'user_id' => $userId,
        'signed_in' => time(),
        'last_seen' => time(),
        'csrf' => bin2hex(random_bytes(32)),
    ];
}

function anonymous_session(): void
{
    $_SESSION = [];
    session_regenerate_id(true);
    $_SESSION['last_seen'] = time();
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
}

function register_account(array $data): never
{
    $email = email_value($data);
    $name = text_value($data, 'name', 100);
    $password = password_value($data);
    try {
        // Роль специально не передаём: по умолчанию в базе это обычный пользователь.
        $id = query('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?) RETURNING id', [
            $email, password_hash($password, PASSWORD_DEFAULT), $name,
        ])->fetchColumn();
    } catch (PDOException $error) {
        // 23505 — код PostgreSQL для нарушения UNIQUE: такой email уже есть.
        if ($error->getCode() === '23505') {
            invalid('email', 'Этот email уже зарегистрирован.');
        }
        throw $error;
    }
    establish_session((int) $id);
    respond(['user' => current_user(), 'csrf' => $_SESSION['csrf']], 201);
}

// Считаем неудачные попытки за последние 15 минут отдельно по email и по IP.
function too_many_login_attempts(string $email, string $ip): bool
{
    query("DELETE FROM login_attempts WHERE attempted_at < CURRENT_TIMESTAMP - INTERVAL '15 minutes'");
    $accountAttempts = (int) query("SELECT COUNT(*) FROM login_attempts
        WHERE email = ? AND attempted_at >= CURRENT_TIMESTAMP - INTERVAL '15 minutes'", [$email])->fetchColumn();
    $ipAttempts = (int) query("SELECT COUNT(*) FROM login_attempts
        WHERE ip = ? AND attempted_at >= CURRENT_TIMESTAMP - INTERVAL '15 minutes'", [$ip])->fetchColumn();
    return $accountAttempts >= ACCOUNT_LOGIN_LIMIT || $ipAttempts >= IP_LOGIN_LIMIT;
}

function record_login_failure(string $email, string $ip): void
{
    query('INSERT INTO login_attempts (email, ip) VALUES (?, ?)', [$email, $ip]);
}

function login_account(array $data): never
{
    $email = email_value($data);
    $password = password_value($data);
    $ip = client_ip();
    if (too_many_login_attempts($email, $ip)) {
        throw new ApiError(429, 'Слишком много попыток. Повторите через 15 минут.');
    }
    $user = query('SELECT id, password_hash FROM users WHERE email = ?', [$email])->fetch();
    if (!$user || !password_verify($password, $user['password_hash'])) {
        record_login_failure($email, $ip);
        throw new ApiError(401, 'Неверный email или пароль.');
    }
    // После успешного входа чистим попытки только этого аккаунта,
    // чужие неудачи с того же IP остаются в счёте.
    query('DELETE FROM login_attempts WHERE email = ?', [$email]);
    establish_session((int) $user['id']);
    respond(['user' => current_user(), 'csrf' => $_SESSION['csrf']]);
}

function logout_account(): never
{
    anonymous_session();
    respond(['user' => null, 'csrf' => $_SESSION['csrf']]);
}
