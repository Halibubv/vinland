$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$pgBin = 'E:\Codex\tools\postgresql\pgsql\bin'
$phpExe = 'E:\Codex\tools\php\php.exe'
$pythonExe = 'C:\Users\yogip\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$pgData = Join-Path $projectRoot '.postgres-data'
$pgPort = 55432
$uiPort = 8082
$dbName = 'vinland_ui_' + (Get-Date -Format 'yyyyMMdd_HHmmss')
$startedDatabase = $false
$phpServer = $null

try {
    & (Join-Path $pgBin 'pg_isready.exe') -h 127.0.0.1 -p $pgPort -q
    if ($LASTEXITCODE -ne 0) {
        & (Join-Path $pgBin 'pg_ctl.exe') start -D $pgData -o "-p $pgPort -h 127.0.0.1" -l (Join-Path $projectRoot 'postgresql-server.log') -w -t 90
        if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL did not start' }
        $startedDatabase = $true
    }
    & (Join-Path $pgBin 'pg_isready.exe') -h 127.0.0.1 -p $pgPort -q
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL is not ready on port 55432' }

    $admin = $null
    foreach ($candidate in @('postgres', 'yogip', 'vinland')) {
        $canCreate = & (Join-Path $pgBin 'psql.exe') -h 127.0.0.1 -p $pgPort -U $candidate -d postgres -At -c 'SELECT rolcreatedb OR rolsuper FROM pg_roles WHERE rolname = current_user' 2>$null
        if ($LASTEXITCODE -eq 0 -and $canCreate -eq 't') { $admin = $candidate; break }
    }
    if (-not $admin) { throw 'No local role may create the isolated UI test database' }
    & (Join-Path $pgBin 'createdb.exe') -h 127.0.0.1 -p $pgPort -U $admin -O vinland $dbName
    if ($LASTEXITCODE -ne 0) { throw 'Could not create isolated UI test database' }

    $env:DB_HOST = '127.0.0.1'
    $env:DB_PORT = [string]$pgPort
    $env:DB_NAME = $dbName
    $env:DB_USER = 'vinland'
    $env:DB_PASSWORD = ''
    $env:SESSION_SECURE = '0'
    $env:UI_TEST_BASE = "http://127.0.0.1:$uiPort"
    $env:PYTHONPATH = Join-Path $projectRoot '.test-deps'
    & $phpExe -d extension_dir='E:\Codex\tools\php\ext' -d extension=pdo_pgsql (Join-Path $projectRoot 'database\migrate.php')
    if ($LASTEXITCODE -ne 0) { throw 'Migrations failed' }
    $env:TEST_ADMIN_EMAIL = (& $phpExe -d extension_dir='E:\Codex\tools\php\ext' -d extension=pdo_pgsql (Join-Path $PSScriptRoot 'seed-admin.php')).Trim()
    if ($LASTEXITCODE -ne 0 -or -not $env:TEST_ADMIN_EMAIL) { throw 'Admin seed failed' }

    if (Get-NetTCPConnection -LocalPort $uiPort -State Listen -ErrorAction SilentlyContinue) { throw "Port $uiPort is already in use" }
    $phpServer = Start-Process -FilePath $phpExe -ArgumentList @('-d', 'extension_dir=E:\Codex\tools\php\ext', '-d', 'extension=pdo_pgsql', '-S', "127.0.0.1:$uiPort", '-t', (Join-Path $projectRoot 'public'), (Join-Path $projectRoot 'router.php')) -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $projectRoot 'ui-test-http.log') -RedirectStandardError (Join-Path $projectRoot 'ui-test-http-error.log')
    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        try {
            $health = Invoke-RestMethod -Uri "$env:UI_TEST_BASE/api/health" -TimeoutSec 2
            if ($health.status -eq 'ok') { $ready = $true; break }
        } catch { Start-Sleep -Milliseconds 200 }
    }
    if (-not $ready) { throw 'PHP API did not become healthy' }
    & $pythonExe (Join-Path $PSScriptRoot 'ui-browser.py')
    if ($LASTEXITCODE -ne 0) { throw 'UI browser checks failed' }
    & $pythonExe (Join-Path $PSScriptRoot 'ui-crud.py')
    if ($LASTEXITCODE -ne 0) { throw 'UI CRUD browser checks failed' }
    Write-Output "Isolated UI test database: $dbName"
} finally {
    if ($phpServer -and -not $phpServer.HasExited) { Stop-Process -Id $phpServer.Id }
    if ($startedDatabase) { & (Join-Path $pgBin 'pg_ctl.exe') stop -D $pgData -m fast -w -t 30 }
}
