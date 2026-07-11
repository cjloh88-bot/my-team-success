. (Join-Path $PSScriptRoot "common.ps1")

$taskName = "my-team-success-backup"
$backupScript = Join-Path $PSScriptRoot "backup.ps1"
$arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$backupScript`""
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arguments
$trigger = New-ScheduledTaskTrigger -Daily -At "11:00 PM"
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Creates a nightly my-team-success database backup." -Force | Out-Null
Write-Host "Nightly backup task '$taskName' installed." -ForegroundColor Green
