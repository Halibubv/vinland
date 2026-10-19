<?php
declare(strict_types=1);
require dirname(__DIR__) . '/backend/config.php';
require dirname(__DIR__) . '/backend/database.php';
// CLI only: this file is outside the web server document root.
if (PHP_SAPI !== 'cli') {
    exit(1);
}
$db = database();
$db->beginTransaction();
try {
    $db->exec("SELECT pg_advisory_xact_lock(724191)");
    $db->exec('CREATE TABLE IF NOT EXISTS migrations (name VARCHAR(150) PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)');
    foreach (glob(__DIR__ . '/*.sql') as $file) {
        $name = basename($file);
        if (query('SELECT 1 FROM migrations WHERE name = ?', [$name])->fetchColumn()) {
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
