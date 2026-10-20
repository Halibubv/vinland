<?php
// Подключение к MySQL и общие функции для запросов и текущего пользователя.
declare(strict_types=1);

function database(): PDO
{
    static $connection = null;
    if ($connection === null) {
        $settings = database_settings();
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            // Настоящие подготовленные запросы: числа из базы приходят числами, а не строками.
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        // Облачные MySQL (например, Aiven) принимают подключение только по SSL.
        if ($settings['ssl_ca'] !== '') {
            $options[PDO::MYSQL_ATTR_SSL_CA] = $settings['ssl_ca'];
            $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = true;
        }
        $connection = new PDO($settings['dsn'], $settings['user'], $settings['password'], $options);
    }
    return $connection;
}

// Два способа задать базу: одна строка DATABASE_URL (так её выдаёт хостинг, например Aiven)
// или отдельные DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD (как в .env.example).
function database_settings(): array
{
    $url = config('DATABASE_URL');
    if ($url === '') {
        $host = config('DB_HOST', '127.0.0.1');
        $port = config('DB_PORT', '3306');
        $name = config('DB_NAME', 'vinland');
        $user = config('DB_USER', 'vinland');
        $password = config('DB_PASSWORD');
    } else {
        // Пример: mysql://avnadmin:пароль@mysql-xxxx.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED
        $parts = parse_url($url);
        if ($parts === false || !isset($parts['host'], $parts['path'])) {
            throw new RuntimeException('DATABASE_URL has an unexpected format');
        }
        $host = $parts['host'];
        $port = (string) ($parts['port'] ?? 3306);
        $name = urldecode(ltrim($parts['path'], '/'));
        $user = urldecode($parts['user'] ?? '');
        $password = urldecode($parts['pass'] ?? '');
    }

    return [
        // charset=utf8mb4 — чтобы русские буквы передавались без искажений.
        'dsn' => 'mysql:host=' . $host . ';port=' . $port . ';dbname=' . $name . ';charset=utf8mb4',
        'user' => $user,
        'password' => $password,
        'ssl_ca' => ssl_certificate_file(),
    ];
}

// DB_SSL_CA — сертификат сервера базы (файл ca.pem из панели хостинга).
// Можно указать путь к файлу или вставить сам текст сертификата: на хостинге
// приложения проще задать переменную, чем положить файл. Текст сохраняем во
// временный файл, потому что PDO принимает только путь.
function ssl_certificate_file(): string
{
    $value = trim(config('DB_SSL_CA'));
    if ($value === '' || !str_starts_with($value, '-----BEGIN')) {
        return $value;
    }
    $file = sys_get_temp_dir() . '/vinland-db-ca-' . md5($value) . '.pem';
    if (!is_file($file)) {
        file_put_contents($file, $value . "\n");
    }
    return $file;
}

function query(string $sql, array $parameters = []): PDOStatement
{
    $statement = database()->prepare($sql);
    $statement->execute($parameters);
    return $statement;
}

// INSERT и сразу id новой строки (AUTO_INCREMENT).
function insert(string $sql, array $parameters = []): int
{
    query($sql, $parameters);
    return (int) database()->lastInsertId();
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
