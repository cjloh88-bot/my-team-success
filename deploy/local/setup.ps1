param(
  [string]$ServerAddress,
  [int]$AppPort = 3000,
  [int]$SupabasePort = 8000
)

. (Join-Path $PSScriptRoot "common.ps1")

$PinnedSupabaseCommit = "1ce1fd66643c90f9f51f72e59220bb59664ee535"

Assert-Command "docker"
Assert-Command "git"
Assert-Command "bash"
& bash -lc "command -v openssl >/dev/null && command -v jq >/dev/null"
if ($LASTEXITCODE -ne 0) { throw "Git Bash must be able to find both openssl and jq. Ask IT to install jq and add it to PATH." }
& docker info *> $null
if ($LASTEXITCODE -ne 0) { throw "Docker is installed but not running. Start Docker Desktop and run this script again." }

if ([string]::IsNullOrWhiteSpace($ServerAddress)) {
  $ServerAddress = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
    Where-Object { $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and $_.IPAddressToString -notlike "127.*" -and $_.IPAddressToString -notlike "169.254.*" } |
    Select-Object -ExpandProperty IPAddressToString -First 1
}
if ([string]::IsNullOrWhiteSpace($ServerAddress)) { throw "Could not detect a LAN address. Run setup.ps1 -ServerAddress 192.168.x.x" }

New-Item -ItemType Directory -Force -Path $RuntimeRoot | Out-Null
$OfflineDocker = Join-Path $PSScriptRoot "offline-bundle\supabase-docker"
$UsingOfflineBundle = Test-Path -LiteralPath $OfflineDocker
if (-not (Test-Path -LiteralPath $SupabaseRoot)) {
  if ($UsingOfflineBundle) {
    New-Item -ItemType Directory -Force -Path $SupabaseDocker | Out-Null
    Copy-Item -Path (Join-Path $OfflineDocker "*") -Destination $SupabaseDocker -Recurse -Force
  } else {
    & git clone --filter=blob:none --no-checkout https://github.com/supabase/supabase $SupabaseRoot
    if ($LASTEXITCODE -ne 0) { throw "Could not download the official Supabase Docker configuration." }
    & git -C $SupabaseRoot fetch --depth 1 origin $PinnedSupabaseCommit
    if ($LASTEXITCODE -ne 0) { throw "Could not fetch pinned Supabase commit $PinnedSupabaseCommit." }
    & git -C $SupabaseRoot checkout --detach $PinnedSupabaseCommit
    if ($LASTEXITCODE -ne 0) { throw "Could not check out pinned Supabase commit $PinnedSupabaseCommit." }
  }
}

if (-not (Test-Path -LiteralPath $DeploymentEnv)) {
  Copy-Item -LiteralPath (Join-Path $SupabaseDocker ".env.example") -Destination $DeploymentEnv
  Push-Location $SupabaseDocker
  try {
    & bash "./utils/generate-keys.sh"
    if ($LASTEXITCODE -ne 0) { throw "Supabase secret generation failed." }
    & bash "./utils/add-new-auth-keys.sh"
    if ($LASTEXITCODE -ne 0) { throw "Supabase API key generation failed." }
  } finally {
    Pop-Location
  }
}

$SupabaseUrl = "http://${ServerAddress}:$SupabasePort"
$AppUrl = "http://${ServerAddress}:$AppPort"
$sourcePath = $ProjectRoot.Replace("\", "/")

Set-EnvValue $DeploymentEnv "APP_SOURCE_DIR" $sourcePath
Set-EnvValue $DeploymentEnv "APP_PORT" "$AppPort"
Set-EnvValue $DeploymentEnv "KONG_HTTP_PORT" "$SupabasePort"
Set-EnvValue $DeploymentEnv "SUPABASE_PUBLIC_URL" $SupabaseUrl
Set-EnvValue $DeploymentEnv "API_EXTERNAL_URL" "$SupabaseUrl/auth/v1"
Set-EnvValue $DeploymentEnv "SITE_URL" $AppUrl
Set-EnvValue $DeploymentEnv "ADDITIONAL_REDIRECT_URLS" "http://localhost:$AppPort/**,$AppUrl/**"
Set-EnvValue $DeploymentEnv "NEXT_PUBLIC_SUPABASE_URL" $SupabaseUrl
Set-EnvValue $DeploymentEnv "NEXT_PUBLIC_APP_URL" $AppUrl
Set-EnvValue $DeploymentEnv "ENABLE_EMAIL_AUTOCONFIRM" "true"
Set-EnvValue $DeploymentEnv "ENABLE_PHONE_SIGNUP" "false"
Set-EnvValue $DeploymentEnv "OPENAI_API_KEY" ""
Set-EnvValue $DeploymentEnv "APP_OPENAI_API_KEY" ""
Set-EnvValue $DeploymentEnv "APP_SLACK_WEBHOOK_URL" ""
if ([string]::IsNullOrWhiteSpace((Get-EnvValue $DeploymentEnv "APP_CRON_SECRET"))) {
  Set-EnvValue $DeploymentEnv "APP_CRON_SECRET" (New-RandomSecret 32)
}

if ($UsingOfflineBundle) {
  & docker image inspect "my-team-success:local" *> $null
  if ($LASTEXITCODE -ne 0) { throw "Offline app image is missing. Run import-offline-images.ps1 first." }
  Invoke-LocalCompose -ComposeArguments @("up", "-d", "--no-build", "--wait")
} else {
  Invoke-LocalCompose -ComposeArguments @("up", "-d", "--build", "--wait")
}

$migrationFiles = Get-ChildItem -LiteralPath (Join-Path $ProjectRoot "supabase\migrations") -Filter "*.sql" | Sort-Object Name
foreach ($migration in $migrationFiles) {
  Write-Host "Applying $($migration.Name)..."
  Get-Content -LiteralPath $migration.FullName -Raw | & docker compose --env-file $DeploymentEnv -f $BaseCompose -f $AppCompose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) { throw "Migration $($migration.Name) failed." }
}

Write-Host ""
Write-Host "my-team-success is ready on the company network: $AppUrl" -ForegroundColor Green
Write-Host "Local Supabase Studio/API: $SupabaseUrl"
Write-Host "Run deploy\local\backup.ps1 after creating the first administrator account."
