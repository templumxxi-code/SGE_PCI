[CmdletBinding()]
param(
    [string]$BackupDirectory,
    [int]$RetentionDays = 30,
    [string]$PgDumpPath = $(if ([string]::IsNullOrWhiteSpace($env:PG_DUMP_PATH)) { 'pg_dump.exe' } else { $env:PG_DUMP_PATH })
)

$ErrorActionPreference = 'Stop'
$ScriptRoot = [IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($MyInvocation.MyCommand.Path))
$EnvironmentFile = Join-Path $ScriptRoot 'backup.env'
if (-not (Test-Path -LiteralPath $EnvironmentFile -PathType Leaf)) {
    throw "Arquivo de ambiente do backup nao encontrado: $EnvironmentFile"
}
Get-Content -LiteralPath $EnvironmentFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#') -and $line -match '^([^=]+)=(.*)$') {
        $name = $Matches[1].Trim()
        $value = $Matches[2].Trim()
        if ($name -notmatch '^(DATABASE_HOST|DATABASE_PORT|DATABASE_NAME|DATABASE_USER|DATABASE_PASSWORD|PGPASSWORD|PGPASSFILE)$') {
            throw "Variavel nao permitida no arquivo de ambiente do backup: $name"
        }
        Set-Item -Path "Env:$name" -Value $value
    }
}
if ([string]::IsNullOrWhiteSpace($env:PGPASSWORD) -and -not [string]::IsNullOrWhiteSpace($env:DATABASE_PASSWORD)) {
    Set-Item -Path 'Env:PGPASSWORD' -Value $env:DATABASE_PASSWORD
}
if ([string]::IsNullOrWhiteSpace($BackupDirectory)) {
    $BackupDirectory = '..\storage\backups'
}
if ($PgDumpPath -eq 'pg_dump.exe' -and -not (Get-Command $PgDumpPath -ErrorAction SilentlyContinue)) {
    $installedPgDump = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\pg_dump.exe' -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
    if ($installedPgDump) {
        $PgDumpPath = $installedPgDump.FullName
    }
}
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
if ([IO.Path]::IsPathRooted($BackupDirectory)) {
    $backupDirectoryFull = [IO.Path]::GetFullPath($BackupDirectory)
} else {
    $backupDirectoryFull = [IO.Path]::GetFullPath([IO.Path]::Combine($ScriptRoot, $BackupDirectory))
}
$backupFile = Join-Path $backupDirectoryFull "sge_pci_$timestamp.sql"
$logFile = Join-Path $backupDirectoryFull 'backup.log'

New-Item -ItemType Directory -Force -Path $backupDirectoryFull | Out-Null
$startedAt = Get-Date
"[$startedAt] backup_start file=$backupFile database=$env:DATABASE_NAME host=$env:DATABASE_HOST" | Add-Content -Path $logFile

try {
    foreach ($variable in 'DATABASE_HOST', 'DATABASE_PORT', 'DATABASE_NAME', 'DATABASE_USER') {
        if ([string]::IsNullOrWhiteSpace((Get-Item "Env:$variable" -ErrorAction SilentlyContinue).Value)) {
            throw "Variavel obrigatoria ausente: $variable"
        }
    }
    if ([string]::IsNullOrWhiteSpace($env:PGPASSWORD) -and [string]::IsNullOrWhiteSpace($env:PGPASSFILE)) {
        throw 'Configure PGPASSWORD via secret manager ou PGPASSFILE; a senha nao deve ser gravada neste script.'
    }

    & $PgDumpPath --host $env:DATABASE_HOST --port $env:DATABASE_PORT --username $env:DATABASE_USER --dbname $env:DATABASE_NAME --format=plain --file $backupFile
    if ($LASTEXITCODE -ne 0) { throw "pg_dump encerrou com exit code $LASTEXITCODE" }
    $file = Get-Item $backupFile
    if ($file.Length -le 0) { throw 'Arquivo de backup vazio' }

    $cutoff = (Get-Date).AddDays(-$RetentionDays)
    Get-ChildItem -Path $backupDirectoryFull -Filter 'sge_pci_*.sql' -File | Where-Object LastWriteTime -lt $cutoff | Remove-Item -Force
    $finishedAt = Get-Date
    "[$finishedAt] backup_success file=$backupFile bytes=$($file.Length) retention_days=$RetentionDays" | Add-Content -Path $logFile
    Write-Output "BACKUP_OK file=$backupFile bytes=$($file.Length)"
    exit 0
} catch {
    $failedAt = Get-Date
    "[$failedAt] backup_failure message=$($_.Exception.Message)" | Add-Content -Path $logFile
    Write-Error $_.Exception.Message
    exit 1
}
