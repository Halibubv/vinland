<?php
// Подключение к PostgreSQL и общие функции для запросов и текущего пользователя.
declare(strict_types=1);

function database(): PDO
{
    static $connection = null;
    if ($connection === null) {
        $settings = database_settings();
        $connection = new PDO($settings['dsn'], $settings['user'], $settings['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $connection;
}

// Два способа задать базу: одна строка DATABASE_URL (так её выдают Neon и Render)
// или отдельные DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD (как в .env.example).
function database_settings(): array
{
    $url = config('DATABASE_URL');
    if ($url === '') {
        return [
            'dsn' => 'pgsql:host=' . config('DB_HOST', '127.0.0.1')
                . ';port=' . config('DB_PORT', '5432')
                . ';dbname=' . config('DB_NAME', 'vinland'),
            'user' => config('DB_USER', 'vinland'),
            'password' => config('DB_PASSWORD'),
        ];
    }

    // Пример: postgres://user:password@host/dbname?sslmode=require
    $parts = parse_url($url);
    if ($parts === false || !isset($parts['host'], $parts['path'])) {
        throw new RuntimeException('DATABASE_URL has an unexpected format');
    }
    $port = $parts['port'] ?? 5432;
    $databaseName = urldecode(ltrim($parts['path'], '/'));
    $dsn = 'pgsql:host=' . $parts['host'] . ';port=' . $port . ';dbname=' . $databaseName;

    // Параметры шифрования из строки передаём драйверу как есть: Neon требует SSL.
    $options = [];
    if (isset($parts['query'])) {
        parse_str($parts['query'], $options);
    }
    foreach (['sslmode', 'channel_binding'] as $option) {
        if (isset($options[$option]) && is_string($options[$option])) {
            $dsn .= ';' . $option . '=' . $options[$option];
        }
    }

    return [
        'dsn' => $dsn,
        'user' => urldecode($parts['user'] ?? ''),
        'password' => urldecode($parts['pass'] ?? ''),
    ];
}

function query(string $sql, array $parameters = []): PDOStatement
{
    $statement = database()->prepare($sql);
    $statement->execute($parameters);
    return $statement;
}

function current_user(): ?array
{
    if (empty($_SESSION['user_id'])) {
        return null;
    }
    // password_hash наружу не отдаём, а роль берём только из базы, не из браузера.
    $user = query('SELECT id, email, name, role, target_calories, target_protein_g,
        target_fat_g, target_carbs_g FROM users WHERE id = ?', [$_SESSION['user_id']])->fetch();
    if (!$user) {
        unset($_SESSION['user_id']);
        return null;
    }
    return $user;
}

function require_user(bool $admin = false): array
{
    $user = current_user();
    if (!$user) {
        throw new ApiError(401, 'Войдите в аккаунт.');
    }
    if ($admin && $user['role'] !== 'admin') {
        throw new ApiError(403, 'Этот раздел доступен только администратору.');
    }
    return $user;
}
