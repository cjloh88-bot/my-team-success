. (Join-Path $PSScriptRoot "common.ps1")
Assert-Command "docker"
Assert-DeploymentConfigured

$bundleRoot = Join-Path $PSScriptRoot "offline-bundle"
New-Item -ItemType Directory -Force -Path $bundleRoot | Out-Null

Invoke-LocalCompose -ComposeArguments @("pull")
Invoke-LocalCompose -ComposeArguments @("build", "app")
$images = & docker compose --env-file $DeploymentEnv -f $BaseCompose -f $AppCompose config --images | Sort-Object -Unique
if ($LASTEXITCODE -ne 0 -or $images.Count -eq 0) { throw "Could not list deployment images." }

$archive = Join-Path $bundleRoot "my-team-success-images.tar"
& docker image save --output $archive @images
if ($LASTEXITCODE -ne 0) { throw "Could not export Docker images." }

$dockerConfig = Join-Path $bundleRoot "supabase-docker"
if (Test-Path -LiteralPath $dockerConfig) { Remove-Item -LiteralPath $dockerConfig -Recurse -Force }
New-Item -ItemType Directory -Force -Path $dockerConfig | Out-Null
Copy-Item -Path (Join-Path $SupabaseDocker "*") -Destination $dockerConfig -Recurse -Force
$copiedEnv = Join-Path $dockerConfig ".env"
if (Test-Path -LiteralPath $copiedEnv) { Remove-Item -LiteralPath $copiedEnv -Force }
Write-Host "Offline image bundle created: $archive" -ForegroundColor Green
Write-Host "Official Supabase Docker configuration copied without deployment secrets."
Write-Host "Copy this repository to the company PC, then run import-offline-images.ps1 before setup.ps1."
