<?php
declare(strict_types=1);

const ACCOUNT_LOGIN_LIMIT = 5;
const IP_LOGIN_LIMIT = 20;
const LOGIN_WINDOW_MINUTES = 15;

function client_ip(): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    return is_string($ip) && strlen($ip) <= 45 ? $ip : 'unknown';
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
        // Role is deliberately omitted: the database default can only create a public user.
        $id = query('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?) RETURNING id', [
            $email, password_hash($password, PASSWORD_DEFAULT), $name,
        ])->fetchColumn();
    } catch (PDOException $error) {
        if ($error->getCode() === '23505') {
            invalid('email', 'Этот email уже зарегистрирован.');
        }
        throw $error;
    }
    establish_session((int) $id);
    respond(['user' => current_user(), 'csrf' => $_SESSION['csrf']], 201);
}

function too_many_login_attempts(string $email, string $ip): bool
{
    query("DELETE FROM login_attempts WHERE attempted_at < CURRENT_TIMESTAMP - INTERVAL '15 minutes'");
    $counts = query("SELECT
        COUNT(*) FILTER (WHERE email = ?) AS account_attempts,
        COUNT(*) FILTER (WHERE ip = ?) AS ip_attempts
        FROM login_attempts WHERE attempted_at >= CURRENT_TIMESTAMP - INTERVAL '15 minutes'", [$email, $ip])->fetch();
    return (int) $counts['account_attempts'] >= ACCOUNT_LOGIN_LIMIT
        || (int) $counts['ip_attempts'] >= IP_LOGIN_LIMIT;
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
    // Clear only this account's successful recovery, never failures of other accounts sharing the IP.
    query('DELETE FROM login_attempts WHERE email = ?', [$email]);
    establish_session((int) $user['id']);
    respond(['user' => current_user(), 'csrf' => $_SESSION['csrf']]);
}

function logout_account(): never
{
    anonymous_session();
    respond(['user' => null, 'csrf' => $_SESSION['csrf']]);
}
