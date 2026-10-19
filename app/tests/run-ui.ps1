# Runs tests/ui.mjs against a throwaway database, so real data is never touched.
#
#   .\tests\run-ui.ps1 -PgUser postgres            # PGPASSWORD must hold that role's password
#   .\tests\run-ui.ps1 -PhpExe C:\php\php.exe -PgBin C:\pgsql\bin -KeepDatabase
#
# The role in -PgUser must be allowed to create databases. The application itself
# connects as DB_USER/DB_PASSWORD from .env, only DB_NAME is switched to the test copy.
param(
    [string]$PhpExe = 'php',
    [string]$PgBin = '',
    [string]$PgUser = 'postgres',
    [string]$PgHost = '127.0.0.1',
    [int]$PgPort = 5432,
    [int]$Port = 8090,
    [switch]$KeepDatabase
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$pg = { param($name) if ($PgBin) { Join-Path $PgBin "$name.exe" } else { $name } }

$owner = (Get-Content (Join-Path $root '.env') | Where-Object { $_ -match '^DB_USER=' }) -replace '^DB_USER=', ''
if (-not $owner) { throw 'DB_USER is missing in .env' }
$dbName = 'vinland_ui_' + (Get-Date -Format 'yyyyMMdd_HHmmss')
$server = $null
$created = $false

try {
    & (& $pg 'createdb') -h $PgHost -p $PgPort -U $PgUser -O $owner $dbName
    if ($LASTEXITCODE -ne 0) { throw "Could not create $dbName as $PgUser" }
    $created = $true

    $env:DB_HOST = $PgHost
    $env:DB_PORT = [string]$PgPort
    $env:DB_NAME = $dbName
    $env:SESSION_SECURE = '0'
    & $PhpExe (Join-Path $root 'database\migrate.php')
    if ($LASTEXITCODE -ne 0) { throw 'Migrations failed' }
    $env:TEST_ADMIN_EMAIL = (& $PhpExe (Join-Path $PSScriptRoot 'seed-admin.php')).Trim()
    if (-not $env:TEST_ADMIN_EMAIL) { throw 'Admin seed failed' }

    if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
        throw "Port $Port is busy, pass -Port"
    }
    $server = Start-Process -FilePath $PhpExe -WorkingDirectory $root -WindowStyle Hidden -PassThru `
        -ArgumentList @('-S', "127.0.0.1:$Port", '-t', 'public', 'router.php')
    $env:UI_TEST_BASE = "http://127.0.0.1:$Port"
    $ready = $false
    for ($i = 0; $i -lt 50 -and -not $ready; $i++) {
        try { $ready = (Invoke-RestMethod "$env:UI_TEST_BASE/api/health" -TimeoutSec 2).status -eq 'ok' }
        catch { Start-Sleep -Milliseconds 200 }
    }
    if (-not $ready) { throw 'PHP server did not answer /api/health' }

    node (Join-Path $PSScriptRoot 'ui.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'UI checks failed' }
} finally {
    if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id }
    if ($created -and -not $KeepDatabase) {
        & (& $pg 'dropdb') -h $PgHost -p $PgPort -U $PgUser $dbName
    } elseif ($created) {
        Write-Output "Test database kept: $dbName"
    }
}
