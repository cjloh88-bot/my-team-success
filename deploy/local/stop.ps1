. (Join-Path $PSScriptRoot "common.ps1")
Assert-Command "docker"
Invoke-LocalCompose -ComposeArguments @("stop")
Write-Host "my-team-success is stopped. Database files are preserved." -ForegroundColor Yellow
