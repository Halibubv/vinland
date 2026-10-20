# Общие функции для run-ui.ps1 и run-http.ps1: временная база MySQL и тестовый PHP-сервер.
# Подключается командой: . (Join-Path $PSScriptRoot 'test-env.ps1')
#
# Пароль администратора MySQL (по умолчанию root) берётся из переменной MYSQL_PWD,
# её же сам читает клиент mysql.exe. Приложение подключается как DB_USER из .env,
# во время тестов меняется только DB_NAME — на временную базу.

# Путь к программе MySQL: из папки -MysqlBin или просто имя, если mysql есть в PATH.
function Get-MysqlTool([string]$MysqlBin, [string]$Name) {
    if ($MysqlBin) { return Join-Path $MysqlBin "$Name.exe" }
    return $Name
}

# Значение настройки из .env (например DB_USER).
function Get-EnvSetting([string]$Root, [string]$Name) {
    $line = Get-Content (Join-Path $Root '.env') | Where-Object { $_ -match "^$Name=" } | Select-Object -First 1
    if (-not $line) { throw "$Name is missing in .env" }
    return $line -replace "^$Name=", ''
}

# Создаёт пустую базу vinland_test_ДАТА и даёт к ней доступ пользователю приложения.
function New-TestDatabase([string]$Mysql, [string]$AdminUser, [string]$DbHost, [int]$DbPort, [string]$AppUser) {
    $name = 'vinland_test_' + (Get-Date -Format 'yyyyMMdd_HHmmss')
    $sql = "CREATE DATABASE $name CHARACTER SET utf8mb4; " +
        "GRANT ALL ON $name.* TO '$AppUser'@'localhost'; GRANT ALL ON $name.* TO '$AppUser'@'127.0.0.1';"
    & $Mysql -h $DbHost -P $DbPort -u $AdminUser -e $sql
    if ($LASTEXITCODE -ne 0) { throw "Could not create $name as $AdminUser" }
    return $name
}

function Remove-TestDatabase([string]$Mysql, [string]$AdminUser, [string]$DbHost, [int]$DbPort, [string]$Name) {
    & $Mysql -h $DbHost -P $DbPort -u $AdminUser -e "DROP DATABASE $Name;"
}

# Запускает php -S на порту и ждёт, пока /api/health ответит. Возвращает процесс.
function Start-TestServer([string]$PhpExe, [string]$Root, [int]$Port) {
    if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
        throw "Port $Port is busy, pass -Port"
    }
    $server = Start-Process -FilePath $PhpExe -WorkingDirectory $Root -WindowStyle Hidden -PassThru `
        -ArgumentList @('-S', "127.0.0.1:$Port", '-t', 'public', 'router.php')
    for ($i = 0; $i -lt 50; $i++) {
        try {
            if ((Invoke-RestMethod "http://127.0.0.1:$Port/api/health" -TimeoutSec 2).status -eq 'ok') { return $server }
        } catch { Start-Sleep -Milliseconds 200 }
    }
    Stop-Process -Id $server.Id
    throw 'PHP server did not answer /api/health'
}
