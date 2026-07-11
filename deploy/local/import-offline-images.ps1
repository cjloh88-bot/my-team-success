param([string]$Archive = (Join-Path $PSScriptRoot "offline-bundle\my-team-success-images.tar"))

if (-not (Test-Path -LiteralPath $Archive)) { throw "Docker image archive not found: $Archive" }
& docker image load --input $Archive
if ($LASTEXITCODE -ne 0) { throw "Could not import Docker images." }
Write-Host "Offline Docker images imported." -ForegroundColor Green
