. (Join-Path $PSScriptRoot "common.ps1")

$taskName = "my-team-success"
$startScript = Join-Path $PSScriptRoot "start.ps1"
$arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$startScript`""
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arguments
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 2)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Starts my-team-success and its local database after sign-in." -Force | Out-Null
Write-Host "Startup task '$taskName' installed for $env:USERNAME." -ForegroundColor Green
Write-Host "Also enable 'Start Docker Desktop when you sign in' in Docker Desktop settings."
