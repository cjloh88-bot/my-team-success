param(
  [Parameter(Mandatory = $true)][string]$BackupFile,
  [switch]$ConfirmRestore
)

. (Join-Path $PSScriptRoot "common.ps1")
if (-not $ConfirmRestore) { throw "Restore replaces current database contents. Re-run with -ConfirmRestore after checking the backup path." }
$resolvedBackup = (Resolve-Path -LiteralPath $BackupFile).Path

& docker cp $resolvedBackup "supabase-db:/tmp/my-team-success-restore.dump"
if ($LASTEXITCODE -ne 0) { throw "Could not copy backup into the database container." }
& docker exec supabase-db pg_restore -U postgres -d postgres --clean --if-exists --no-owner /tmp/my-team-success-restore.dump
if ($LASTEXITCODE -ne 0) { throw "Database restore failed." }
& docker exec supabase-db rm -f /tmp/my-team-success-restore.dump
Write-Host "Database restored from $resolvedBackup" -ForegroundColor Green
