# Запускает tests/ui.mjs на временной базе MySQL, чтобы не трогать настоящие данные.
#
#   $env:MYSQL_PWD = 'пароль root'
#   .\tests\run-ui.ps1
#   .\tests\run-ui.ps1 -PhpExe C:\php\php.exe -MysqlBin 'C:\mysql\bin' -KeepDatabase
param(
    [string]$PhpExe = 'php',
    [string]$MysqlBin = '',
    [string]$MysqlUser = 'root',
    [string]$DbHost = '127.0.0.1',
    [int]$DbPort = 3306,
    [int]$Port = 8090,
    [switch]$KeepDatabase
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'test-env.ps1')
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$mysql = Get-MysqlTool $MysqlBin 'mysql'
$database = $null
$server = $null

try {
    $database = New-TestDatabase $mysql $MysqlUser $DbHost $DbPort (Get-EnvSetting $root 'DB_USER')
    $env:DB_HOST = $DbHost
    $env:DB_PORT = [string]$DbPort
    $env:DB_NAME = $database
    $env:SESSION_SECURE = '0'
    & $PhpExe (Join-Path $root 'database\migrate.php')
    if ($LASTEXITCODE -ne 0) { throw 'Migrations failed' }
    $env:TEST_ADMIN_EMAIL = (& $PhpExe (Join-Path $PSScriptRoot 'seed-admin.php')).Trim()

    $server = Start-TestServer $PhpExe $root $Port
    $env:UI_TEST_BASE = "http://127.0.0.1:$Port"
    node (Join-Path $PSScriptRoot 'ui.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'UI checks failed' }
} finally {
    if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id }
    if ($database -and -not $KeepDatabase) { Remove-TestDatabase $mysql $MysqlUser $DbHost $DbPort $database }
    elseif ($database) { Write-Output "Test database kept: $database" }
}
