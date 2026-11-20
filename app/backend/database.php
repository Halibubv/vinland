<?php
// Подключение к базе MySQL через PDO и две короткие функции для запросов.

// Возвращает подключение к базе. Подключаемся один раз за запрос:
// static-переменная запоминает подключение между вызовами функции.
function database()
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    // На хостинге база задаётся одной строкой DATABASE_URL, например:
    // mysql://user:password@mysql-xxxx.aivencloud.com:12345/defaultdb
    // На своём компьютере — отдельными настройками DB_HOST, DB_NAME и т. д. в .env.
    $url = config('DATABASE_URL');
    if ($url !== '') {
        $parts = parse_url($url);
        $host = $parts['host'];
        $port = $parts['port'] ?? 3306;
        $name = urldecode(ltrim($parts['path'], '/'));
        $user = urldecode($parts['user'] ?? '');
        $password = urldecode($parts['pass'] ?? '');
    } else {
        $host = config('DB_HOST', '127.0.0.1');
        $port = config('DB_PORT', '3306');
        $name = config('DB_NAME', 'vinland');
        $user = config('DB_USER', 'vinland');
        $password = config('DB_PASSWORD');
    }

    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,       // ошибка SQL сразу останавливает запрос
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,  // строки приходят массивами ['name' => ...]
        PDO::ATTR_EMULATE_PREPARES => false,               // числа из базы приходят числами
    ];

    // Облачная база (Aiven) пускает только по защищённому соединению SSL.
    // Для этого нужен файл сертификата, его путь даёт функция ниже.
    $certificate = ssl_certificate_file();
    if ($certificate !== '') {
        $options[PDO::MYSQL_ATTR_SSL_CA] = $certificate;
        $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = true;
    }

    // charset=utf8mb4 — чтобы русские буквы не превращались в знаки вопроса.
    $dsn = "mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $password, $options);
    return $pdo;
}

// Сертификат облачной базы (файл ca.pem из панели Aiven) задаётся в настройке DB_SSL_CA.
// Там может быть путь к файлу или сам текст сертификата. PDO понимает только путь,
// поэтому текст сохраняем во временный файл.
function ssl_certificate_file()
{
    $value = trim(config('DB_SSL_CA'));
    if ($value === '' || is_file($value)) {
        return $value;
    }

    // При копировании в настройки хостинга теряются переносы строк. Убираем строки
    // BEGIN/END и всё лишнее, оставляем сам код и собираем файл заново по 64 символа в строке.
    $code = preg_replace('/-----[A-Z ]+-----/', '', $value);
    $code = preg_replace('/[^A-Za-z0-9+\/=]/', '', $code);
    $text = "-----BEGIN CERTIFICATE-----\n" . chunk_split($code, 64, "\n") . "-----END CERTIFICATE-----\n";

    $file = sys_get_temp_dir() . '/vinland-db-ca.pem';
    file_put_contents($file, $text);
    return $file;
}

// Выполнить SQL-запрос. Вместо значений в SQL пишем знаки ?, а сами значения
// передаём массивом: так PDO защищает от SQL-инъекций.
// Пример: query('SELECT * FROM users WHERE id = ?', [5])->fetch();
function query($sql, $values = [])
{
    $statement = database()->prepare($sql);
    $statement->execute($values);
    return $statement;
}

// INSERT, который возвращает id только что добавленной строки.
function insert($sql, $values = [])
{
    query($sql, $values);
    return (int) database()->lastInsertId();
}
