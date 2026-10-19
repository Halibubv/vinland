<?php
// Создаёт администратора или делает администратором существующий аккаунт.
// Только из консоли: php database/create-admin.php email@example.com "пароль" ["Имя"]
declare(strict_types=1);
require dirname(__DIR__) . '/backend/config.php';
require dirname(__DIR__) . '/backend/database.php';

if (PHP_SAPI !== 'cli') {
    exit(1);
}
$email = strtolower(trim($argv[1] ?? ''));
$password = $argv[2] ?? '';
$name = $argv[3] ?? 'Администратор';
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 10 || strlen($password) > 72) {
    fwrite(STDERR, "Usage: php database/create-admin.php email password [name]\nPassword: 10-72 bytes.\n");
    exit(1);
}
$hash = password_hash($password, PASSWORD_DEFAULT);
$existingId = query('SELECT id FROM users WHERE email = ?', [$email])->fetchColumn();
if ($existingId) {
    query("UPDATE users SET role = 'admin', password_hash = ? WHERE id = ?", [$hash, $existingId]);
    echo "Account {$email} is now an administrator.\n";
} else {
    query("INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, 'admin')", [$email, $hash, $name]);
    echo "Administrator {$email} created.\n";
}
