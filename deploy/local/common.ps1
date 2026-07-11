$ErrorActionPreference = "Stop"

$script:ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$script:RuntimeRoot = Join-Path $PSScriptRoot "runtime"
$script:SupabaseRoot = Join-Path $RuntimeRoot "supabase"
$script:SupabaseDocker = Join-Path $SupabaseRoot "docker"
$script:DeploymentEnv = Join-Path $SupabaseDocker ".env"
$script:BaseCompose = Join-Path $SupabaseDocker "docker-compose.yml"
$script:AppCompose = Join-Path $PSScriptRoot "docker-compose.app.yml"

function Assert-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' is not installed or is not on PATH."
  }
}

function Assert-DeploymentConfigured {
  if (-not (Test-Path -LiteralPath $DeploymentEnv) -or -not (Test-Path -LiteralPath $BaseCompose)) {
    throw "Local deployment is not configured. Run deploy\local\setup.ps1 first."
  }
}

function Invoke-LocalCompose {
  param([string[]]$ComposeArguments)
  Assert-DeploymentConfigured
  & docker compose --env-file $DeploymentEnv -f $BaseCompose -f $AppCompose @ComposeArguments
  if ($LASTEXITCODE -ne 0) { throw "Docker Compose command failed with exit code $LASTEXITCODE." }
}

function Set-EnvValue([string]$Path, [string]$Name, [string]$Value) {
  $lines = [System.Collections.Generic.List[string]]::new()
  if (Test-Path -LiteralPath $Path) {
    foreach ($line in [System.IO.File]::ReadAllLines($Path)) { $lines.Add($line) }
  }
  $prefix = "$Name="
  $updated = $false
  for ($index = 0; $index -lt $lines.Count; $index++) {
    if ($lines[$index].StartsWith($prefix, [System.StringComparison]::Ordinal)) {
      $lines[$index] = "$prefix$Value"
      $updated = $true
      break
    }
  }
  if (-not $updated) { $lines.Add("$prefix$Value") }
  [System.IO.File]::WriteAllLines($Path, $lines, [System.Text.UTF8Encoding]::new($false))
}

function Get-EnvValue([string]$Path, [string]$Name) {
  $prefix = "$Name="
  $line = [System.IO.File]::ReadAllLines($Path) | Where-Object { $_.StartsWith($prefix, [System.StringComparison]::Ordinal) } | Select-Object -First 1
  if ($null -eq $line) { return $null }
  return $line.Substring($prefix.Length)
}

function New-RandomSecret([int]$Bytes = 32) {
  $buffer = New-Object byte[] $Bytes
  $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $generator.GetBytes($buffer) } finally { $generator.Dispose() }
  return [Convert]::ToBase64String($buffer).Replace("=", "").Replace("+", "-").Replace("/", "_")
}
