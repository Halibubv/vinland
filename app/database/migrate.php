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

// Блокировка не даёт двум одновременным запускам выполнить одну миграцию дважды.
// GET_LOCK ждёт до 30 секунд, пока другой запуск не закончит.
$locked = query("SELECT GET_LOCK('vinland_migrations', 30)")->fetchColumn();
if ((int) $locked !== 1) {
    fwrite(STDERR, "Another migration is running.\n");
    exit(1);
}

$db->exec('CREATE TABLE IF NOT EXISTS migrations (
    name VARCHAR(150) NOT NULL PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4');

// glob возвращает файлы по алфавиту, поэтому номера 001, 002... задают порядок.
foreach (glob(__DIR__ . '/*.sql') as $file) {
    $name = basename($file);
    $alreadyApplied = query('SELECT 1 FROM migrations WHERE name = ?', [$name])->fetchColumn();
    if ($alreadyApplied) {
        continue;
    }
    // Команды в файле разделены точкой с запятой в конце строки — выполняем их по одной.
    // CREATE TABLE и ALTER TABLE в MySQL нельзя откатить, поэтому транзакции здесь нет:
    // если команда упала, исправьте файл и удалите уже созданные им таблицы вручную.
    $statements = preg_split('/;\s*$/m', file_get_contents($file));
    foreach ($statements as $statement) {
        if (trim(preg_replace('/^\s*--.*$/m', '', $statement)) === '') {
            continue; // пустой кусок или только комментарии
        }
        $db->exec($statement);
    }
    query('INSERT INTO migrations (name) VALUES (?)', [$name]);
    echo 'Applied ' . $name . "\n";
}

query("SELECT RELEASE_LOCK('vinland_migrations')");
