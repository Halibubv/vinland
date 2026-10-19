<?php
declare(strict_types=1);

function database(): PDO
{
    static $connection;
    if (!$connection) {
        $connection = new PDO(
            'pgsql:host=' . config('DB_HOST', '127.0.0.1') . ';port=' . config('DB_PORT', '5432')
            . ';dbname=' . config('DB_NAME', 'vinland'),
            config('DB_USER', 'vinland'), config('DB_PASSWORD'),
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false]
        );
    }
    return $connection;
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
    // Never return password_hash, and never trust a role supplied by the browser.
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
