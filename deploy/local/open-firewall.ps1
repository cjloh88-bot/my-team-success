param(
  [int]$AppPort = 3000,
  [int]$SupabasePort = 8000
)

$rules = @(
  @{ Name = "my-team-success-app"; DisplayName = "my-team-success App"; Port = $AppPort },
  @{ Name = "my-team-success-supabase"; DisplayName = "my-team-success Supabase"; Port = $SupabasePort }
)
foreach ($rule in $rules) {
  Remove-NetFirewallRule -Name $rule.Name -ErrorAction SilentlyContinue
  New-NetFirewallRule -Name $rule.Name -DisplayName $rule.DisplayName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $rule.Port -RemoteAddress LocalSubnet -Profile Domain,Private | Out-Null
}
Write-Host "Firewall access opened for the local subnet only on ports $AppPort and $SupabasePort." -ForegroundColor Green
