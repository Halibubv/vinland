$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$pgBin = 'E:\Codex\tools\postgresql\pgsql\bin'
$phpExe = 'E:\Codex\tools\php\php.exe'
$pgData = Join-Path $projectRoot '.postgres-data'
$pgPort = 55432
$dbName = 'vinland_meal_http_' + (Get-Date -Format 'yyyyMMdd_HHmmss')
$startedDatabase = $false
$phpServer = $null

try {
    & (Join-Path $pgBin 'pg_ctl.exe') status -D $pgData *> $null
    if ($LASTEXITCODE -ne 0) {
        & (Join-Path $pgBin 'pg_ctl.exe') start -D $pgData -o "-p $pgPort -h 127.0.0.1" -l (Join-Path $projectRoot 'postgresql-server.log') -w -t 90
        if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL did not start' }
        $startedDatabase = $true
    }
    & (Join-Path $pgBin 'pg_isready.exe') -h 127.0.0.1 -p $pgPort -q
    if ($LASTEXITCODE -ne 0) { throw 'The project PostgreSQL cluster is not listening on port 55432' }

    $admin = $null
    foreach ($candidate in @('postgres', 'yogip', 'vinland')) {
        $canCreate = & (Join-Path $pgBin 'psql.exe') -h 127.0.0.1 -p $pgPort -U $candidate -d postgres -At -c 'SELECT rolcreatedb OR rolsuper FROM pg_roles WHERE rolname = current_user' 2>$null
        if ($LASTEXITCODE -eq 0 -and $canCreate -eq 't') { $admin = $candidate; break }
    }
    if (-not $admin) { throw 'No local role may create the isolated test database' }
    & (Join-Path $pgBin 'createdb.exe') -h 127.0.0.1 -p $pgPort -U $admin -O vinland $dbName
    if ($LASTEXITCODE -ne 0) { throw 'Could not create isolated test database' }

    $env:DB_HOST = '127.0.0.1'
    $env:DB_PORT = [string]$pgPort
    $env:DB_NAME = $dbName
    $env:DB_USER = 'vinland'
    $env:DB_PASSWORD = ''
    $env:SESSION_SECURE = '0'
    & $phpExe -d extension_dir='E:\Codex\tools\php\ext' -d extension=pdo_pgsql (Join-Path $projectRoot 'database\migrate.php')
    if ($LASTEXITCODE -ne 0) { throw 'Migrations failed' }
    $env:TEST_PRODUCT_ID = (& $phpExe -d extension_dir='E:\Codex\tools\php\ext' -d extension=pdo_pgsql (Join-Path $PSScriptRoot 'seed-meal-product.php')).Trim()
    if ($LASTEXITCODE -ne 0 -or -not $env:TEST_PRODUCT_ID) { throw 'Product seed failed' }
    $env:TEST_ADMIN_EMAIL = (& $phpExe -d extension_dir='E:\Codex\tools\php\ext' -d extension=pdo_pgsql (Join-Path $PSScriptRoot 'seed-admin.php')).Trim()
    if ($LASTEXITCODE -ne 0 -or -not $env:TEST_ADMIN_EMAIL) { throw 'Admin seed failed' }

    $phpServer = Start-Process -FilePath $phpExe -ArgumentList @('-d', 'extension_dir=E:\Codex\tools\php\ext', '-d', 'extension=pdo_pgsql', '-S', '127.0.0.1:8081', '-t', (Join-Path $projectRoot 'public'), (Join-Path $projectRoot 'router.php')) -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $projectRoot 'meals-test-http.log') -RedirectStandardError (Join-Path $projectRoot 'meals-test-http-error.log')
    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        try {
            $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8081/api/health' -TimeoutSec 2
            if ($health.status -eq 'ok') { $ready = $true; break }
        } catch { Start-Sleep -Milliseconds 200 }
    }
    if (-not $ready) { throw 'PHP API did not become healthy' }
    & node (Join-Path $PSScriptRoot 'meals.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Meal HTTP tests failed' }
    & node (Join-Path $PSScriptRoot 'admin-statistics.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Admin/statistics HTTP tests failed' }
    Write-Output "Isolated test database: $dbName"
} finally {
    if ($phpServer -and -not $phpServer.HasExited) { Stop-Process -Id $phpServer.Id }
    if ($startedDatabase) { & (Join-Path $pgBin 'pg_ctl.exe') stop -D $pgData -m fast -w -t 30 }
}
