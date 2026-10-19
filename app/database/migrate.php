<?php
// Миграции: выполняет по порядку файлы database/*.sql, которые ещё не выполнялись,
// и отмечает их в таблице migrations. Запуск только из консоли: php database/migrate.php
declare(strict_types=1);
require dirname(__DIR__) . '/backend/config.php';
require dirname(__DIR__) . '/backend/database.php';

if (PHP_SAPI !== 'cli') {
    exit(1);
}
$db = database();
$db->beginTransaction();
try {
    // Блокировка не даёт двум одновременным запускам выполнить одну миграцию дважды.
    // 724191 — просто любое постоянное число-ключ.
    $db->exec('SELECT pg_advisory_xact_lock(724191)');
    $db->exec('CREATE TABLE IF NOT EXISTS migrations (name VARCHAR(150) PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)');
    // glob возвращает файлы по алфавиту, поэтому номера 001, 002... задают порядок.
    foreach (glob(__DIR__ . '/*.sql') as $file) {
        $name = basename($file);
        $alreadyApplied = query('SELECT 1 FROM migrations WHERE name = ?', [$name])->fetchColumn();
        if ($alreadyApplied) {
            continue;
        }
        $db->exec(file_get_contents($file));
        query('INSERT INTO migrations (name) VALUES (?)', [$name]);
        echo 'Applied ' . $name . "\n";
    }
    $db->commit();
} catch (Throwable $error) {
    $db->rollBack();
    throw $error;
}
