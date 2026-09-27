param(
  [Parameter(Mandatory = $true)][string]$DeploymentUrl
)

# Removes one Vercel preview deployment after staging QA passes.
# Refuses production deployments so a typo cannot take down a live alias.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$inspect = npx vercel inspect $DeploymentUrl 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) { throw "vercel inspect failed for $DeploymentUrl." }
if ($inspect -notmatch 'target\s+preview') { throw "$DeploymentUrl is not a preview deployment." }

npx vercel remove $DeploymentUrl --yes
if ($LASTEXITCODE -ne 0) { throw 'vercel remove failed.' }

npx vercel inspect $DeploymentUrl 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { throw "$DeploymentUrl still exists after removal." }
Write-Output "Removed $DeploymentUrl"
