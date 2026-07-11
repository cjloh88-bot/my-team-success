. (Join-Path $PSScriptRoot "common.ps1")
Assert-Command "docker"
Invoke-LocalCompose -ComposeArguments @("up", "-d", "--wait")
$appUrl = Get-EnvValue $DeploymentEnv "NEXT_PUBLIC_APP_URL"
Write-Host "my-team-success is running at $appUrl" -ForegroundColor Green
