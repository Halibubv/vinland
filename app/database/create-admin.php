<?php
declare(strict_types=1);
require dirname(__DIR__) . '/backend/config.php';
require dirname(__DIR__) . '/backend/database.php';
// CLI only: creates an administrator or promotes an existing account.
// Usage: php database/create-admin.php email@example.com "password" ["Имя"]
if (PHP_SAPI !== 'cli') {
    exit(1);
}
[$script, $email, $password, $name] = $argv + [null, null, null, 'Администратор'];
$email = strtolower(trim((string) $email));
$password = (string) $password;
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 10 || strlen($password) > 72) {
    fwrite(STDERR, "Usage: php database/create-admin.php email password [name]\nPassword: 10-72 bytes.\n");
    exit(1);
}
$hash = password_hash($password, PASSWORD_DEFAULT);
$existing = query('SELECT id FROM users WHERE email = ?', [$email])->fetchColumn();
if ($existing) {
    query("UPDATE users SET role = 'admin', password_hash = ? WHERE id = ?", [$hash, $existing]);
    echo "Account {$email} is now an administrator.\n";
} else {
    query("INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, 'admin')", [$email, $hash, $name]);
    echo "Administrator {$email} created.\n";
}
