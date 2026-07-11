. (Join-Path $PSScriptRoot "common.ps1")
Assert-Command "docker"
Invoke-LocalCompose -ComposeArguments @("ps")
$appUrl = Get-EnvValue $DeploymentEnv "NEXT_PUBLIC_APP_URL"
try {
  $health = Invoke-RestMethod -Uri "$appUrl/api/health" -TimeoutSec 10
  Write-Host "App health: $($health.status) at $appUrl" -ForegroundColor Green
} catch {
  Write-Host "App health check failed at $appUrl" -ForegroundColor Red
  exit 1
}
