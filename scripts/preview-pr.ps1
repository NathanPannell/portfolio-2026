param(
  [Parameter(Mandatory = $true)][int]$PullRequest,
  [string]$Project = 'portfolio-2026'
)

# Deploys the exact local build of a draft PR head as a Vercel preview deployment.
# Uploads only the prebuilt static output, so untracked workspace files never leave the machine.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$pr = gh pr view $PullRequest --json state,baseRefName,headRefOid,isCrossRepository | ConvertFrom-Json
if ($pr.state -ne 'OPEN') { throw "PR #$PullRequest is not open." }
if ($pr.baseRefName -ne 'staging') { throw "PR #$PullRequest must target staging." }
if ($pr.isCrossRepository) { throw "PR #$PullRequest must come from this repository." }

$head = (git rev-parse HEAD).Trim()
if ($head -ne $pr.headRefOid) { throw "Local HEAD $head does not match PR head $($pr.headRefOid). Check out and pull the PR branch." }
if (git status --porcelain --untracked-files=no) { throw 'Tracked files have uncommitted changes.' }

git fetch origin staging --quiet
git merge-base --is-ancestor origin/staging HEAD
if ($LASTEXITCODE -ne 0) { throw 'PR head does not contain the latest origin/staging commit.' }

npm run build
if ($LASTEXITCODE -ne 0) { throw 'npm run build failed.' }

# Vercel Build Output API v3: static files plus a version marker.
$output = Join-Path $root '.vercel/output'
if (Test-Path $output) { Remove-Item -Recurse -Force $output }
New-Item -ItemType Directory -Force (Join-Path $output 'static') | Out-Null
Copy-Item -Recurse -Force (Join-Path $root 'dist/*') (Join-Path $output 'static')
'{"version":3}' | Set-Content -Encoding ascii (Join-Path $output 'config.json')

if (-not (Test-Path (Join-Path $root '.vercel/project.json'))) {
  npx vercel link --yes --project $Project
  if ($LASTEXITCODE -ne 0) { throw 'vercel link failed.' }
}

$url = npx vercel deploy --prebuilt --yes --meta "githubPr=$PullRequest" --meta "githubCommitSha=$head"
if ($LASTEXITCODE -ne 0) { throw 'vercel deploy failed.' }
$url = ($url | Select-Object -Last 1).Trim()
Write-Output "PR #$PullRequest preview for $head"
Write-Output $url
