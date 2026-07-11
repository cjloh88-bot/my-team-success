. (Join-Path $PSScriptRoot "common.ps1")
Assert-Command "docker"
Assert-DeploymentConfigured

$backupRoot = Join-Path $PSScriptRoot "backups"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = Join-Path $backupRoot "my-team-success-$timestamp.dump"

$process = Start-Process -FilePath "docker" -ArgumentList @("exec", "supabase-db", "pg_dump", "-U", "postgres", "-d", "postgres", "-Fc") -NoNewWindow -Wait -PassThru -RedirectStandardOutput $backupFile
if ($process.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $backupFile)) {
  throw "Database backup failed."
}
Write-Host "Backup created: $backupFile" -ForegroundColor Green
