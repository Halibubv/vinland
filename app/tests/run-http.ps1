# Запускает все проверки API (tests/*.mjs, кроме ui.mjs) и PHP-проверки истории
# на временной базе MySQL, чтобы не трогать настоящие данные.
#
#   $env:MYSQL_PWD = 'пароль root'
#   .\tests\run-http.ps1
#   .\tests\run-http.ps1 -PhpExe C:\php\php.exe -MysqlBin 'C:\mysql\bin' -KeepDatabase
param(
    [string]$PhpExe = 'php',
    [string]$MysqlBin = '',
    [string]$MysqlUser = 'root',
    [string]$DbHost = '127.0.0.1',
    [int]$DbPort = 3306,
    [int]$Port = 8091,
    [switch]$KeepDatabase
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'test-env.ps1')
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$mysql = Get-MysqlTool $MysqlBin 'mysql'
$database = $null
$server = $null

# Запуск одной команды; если она завершилась с ошибкой — прерываем всё.
function Invoke-Check([string]$Program, [string]$Script) {
    & $Program (Join-Path $PSScriptRoot $Script)
    if ($LASTEXITCODE -ne 0) { throw "$Script failed" }
}

try {
    $database = New-TestDatabase $mysql $MysqlUser $DbHost $DbPort (Get-EnvSetting $root 'DB_USER')
    $env:DB_HOST = $DbHost
    $env:DB_PORT = [string]$DbPort
    $env:DB_NAME = $database
    $env:SESSION_SECURE = '0'
    & $PhpExe (Join-Path $root 'database\migrate.php')
    if ($LASTEXITCODE -ne 0) { throw 'Migrations failed' }

    # Проверки PHP-функций напрямую, без сервера.
    Invoke-Check $PhpExe 'unit.php'
    Invoke-Check $PhpExe 'meal-history.php'
    Invoke-Check $PhpExe 'workout-history.php'

    # Данные, которые нужны HTTP-проверкам.
    $env:TEST_EXERCISE_IDS = (& $PhpExe (Join-Path $PSScriptRoot 'seed-workout-exercises.php')).Trim()
    $env:TEST_PRODUCT_ID = (& $PhpExe (Join-Path $PSScriptRoot 'seed-meal-product.php')).Trim()
    $env:TEST_ADMIN_EMAIL = (& $PhpExe (Join-Path $PSScriptRoot 'seed-admin.php')).Trim()

    $server = Start-TestServer $PhpExe $root $Port
    $env:TEST_API_URL = "http://127.0.0.1:$Port"
    Invoke-Check 'node' 'http.mjs'
    Invoke-Check 'node' 'workouts.mjs'
    Invoke-Check 'node' 'meals.mjs'
    Invoke-Check 'node' 'admin-statistics.mjs'
    # auth.mjs последним: он специально исчерпывает лимит попыток входа.
    Invoke-Check 'node' 'auth.mjs'
} finally {
    if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id }
    if ($database -and -not $KeepDatabase) { Remove-TestDatabase $mysql $MysqlUser $DbHost $DbPort $database }
    elseif ($database) { Write-Output "Test database kept: $database" }
}
