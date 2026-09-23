param(
  [ValidateRange(1, 2147483647)][int]$PullRequest,
  [switch]$Apply,
  [string]$AccountId,
  [string]$StateDirectory,
  [string]$PreviewId,
  [switch]$Help
)

if ($Help) {
  Write-Output 'Usage: pwsh -File scripts/preview-pr.ps1 -PullRequest N [-PreviewId 8_HEX_ID] [-Apply -AccountId 32_HEX_ID] [-StateDirectory ABSOLUTE_EXTERNAL_PATH]'
  Write-Output 'Default mode plans an open draft PR targeting staging. Apply builds its exact head in an isolated worktree and creates a temporary Cloudflare Pages Direct Upload project.'
  exit 0
}
if ($PullRequest -lt 1) { throw '-PullRequest is required.' }
. (Join-Path $PSScriptRoot 'preview-common.ps1')

$paths = Get-PreviewPaths -PullRequest $PullRequest -StateDirectory $StateDirectory
$previewLock = Enter-PreviewLock -PullRequest $PullRequest -StateDirectory $paths.StateDirectory
try {
Assert-PortfolioRepository
$pr = Get-DraftPullRequest -PullRequest $PullRequest
$baseSha = Get-RemoteStagingSha
if (-not $PreviewId) { $PreviewId = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(4)).ToLowerInvariant() }
if ($PreviewId -cnotmatch '^[0-9a-f]{8}$') { throw '-PreviewId must contain exactly eight lowercase hex characters.' }
$projectName = "portfolio-2026-pr-$PullRequest-$($pr.headRefOid.Substring(0,12))-$PreviewId"
$branch = "pr-$PullRequest"

$previousCleanedJournal = $null
if (Test-Path -LiteralPath $paths.Journal -PathType Leaf) {
  $existing = Read-PreviewJournal -Path $paths.Journal -PullRequest $PullRequest
  if ($existing.phase -cne 'cleaned') { throw "An active preview journal already exists: $($paths.Journal). Tear it down before creating another." }
  $previousCleanedJournal = $existing
}

Write-Output "repository=$script:PreviewRepository"
Write-Output "pull-request=$($pr.url)"
Write-Output "head-sha=$($pr.headRefOid)"
Write-Output "staging-sha=$baseSha"
Write-Output "preview-id=$PreviewId"
Write-Output "preview-project=$projectName"
Write-Output "journal=$($paths.Journal)"
if (-not $Apply) {
  Write-Output 'mode=plan; no Cloudflare call or local build was made'
  exit 0
}

Assert-AccountId -AccountId $AccountId
if (-not (Get-Command npx.cmd -ErrorAction SilentlyContinue)) { throw 'npx.cmd is required.' }
$previousAccountId = [Environment]::GetEnvironmentVariable('CLOUDFLARE_ACCOUNT_ID', 'Process')
$worktree = Join-Path ([System.IO.Path]::GetTempPath()) "portfolio-2026-pr-$PullRequest-$([guid]::NewGuid().ToString('N'))"
$worktreeAdded = $false
$journal = [pscustomobject]@{
  schema = 'portfolio-2026.preview-pr/v1'; repository = $script:PreviewRepository
  pullRequest = $PullRequest; prUrl = $pr.url; headSha = $pr.headRefOid; baseSha = $baseSha
  accountId = $AccountId.ToLowerInvariant(); previewId = $PreviewId; projectName = $projectName; productionBranch = $branch
  previewUrl = $null; phase = 'prepared'; createdAt = [DateTimeOffset]::UtcNow.ToString('o'); updatedAt = $null
}
try {
  & git -C $paths.Root fetch --no-tags origin "refs/pull/$PullRequest/head"
  if ($LASTEXITCODE -ne 0) { throw 'Could not fetch the PR head.' }
  $fetchedHead = (& git -C $paths.Root rev-parse FETCH_HEAD).Trim()
  if ($fetchedHead -cne $pr.headRefOid) { throw 'PR head moved during fetch. Re-plan at the new SHA.' }
  & git -C $paths.Root fetch --no-tags origin refs/heads/staging
  if ($LASTEXITCODE -ne 0) { throw 'Could not fetch current staging.' }
  $fetchedBase = (& git -C $paths.Root rev-parse FETCH_HEAD).Trim()
  if ($fetchedBase -cne $baseSha) { throw 'Staging moved during fetch. Re-plan at the new SHA.' }
  & git -C $paths.Root merge-base --is-ancestor $baseSha $pr.headRefOid
  if ($LASTEXITCODE -ne 0) { throw 'PR head does not include current staging. Update the PR branch and re-plan.' }

  & git -C $paths.Root worktree add --detach $worktree $pr.headRefOid
  if ($LASTEXITCODE -ne 0) { throw 'Could not create isolated PR worktree.' }
  $worktreeAdded = $true
  $isolatedHome = Join-Path ([System.IO.Path]::GetTempPath()) "portfolio-preview-home-$PullRequest-$([guid]::NewGuid().ToString('N'))"
  New-Item -ItemType Directory -Path $isolatedHome | Out-Null
  $buildEnvironment = @{}
  $scrubNames = @('CLOUDFLARE_API_TOKEN','CLOUDFLARE_API_KEY','CLOUDFLARE_EMAIL','CLOUDFLARE_ACCOUNT_ID','CF_API_TOKEN','CF_API_KEY','CF_EMAIL','CF_ACCOUNT_ID','GH_TOKEN','GITHUB_TOKEN','NPM_TOKEN')
  $homeNames = @('HOME','USERPROFILE','APPDATA','LOCALAPPDATA','XDG_CONFIG_HOME','NPM_CONFIG_USERCONFIG','NPM_CONFIG_CACHE')
  foreach ($name in ($scrubNames + $homeNames)) { $buildEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
  foreach ($name in $scrubNames) { [Environment]::SetEnvironmentVariable($name, $null, 'Process') }
  foreach ($name in @('HOME','USERPROFILE','APPDATA','LOCALAPPDATA','XDG_CONFIG_HOME')) {
    [Environment]::SetEnvironmentVariable($name, $isolatedHome, 'Process')
  }
  [Environment]::SetEnvironmentVariable('NPM_CONFIG_USERCONFIG', (Join-Path $isolatedHome '.npmrc'), 'Process')
  [Environment]::SetEnvironmentVariable('NPM_CONFIG_CACHE', (Join-Path $isolatedHome 'npm-cache'), 'Process')
  try {
    Push-Location $worktree
    try {
    $nodeMajor = [int]((& node --version).Trim() -replace '^v(\d+)\..*$', '$1')
    if ($nodeMajor -lt 22 -or $nodeMajor -ge 25) { throw 'Node 22 through 24 is required.' }
    & npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'The release build failed.' }
    if (-not (Test-Path -LiteralPath (Join-Path $worktree 'dist/index.html') -PathType Leaf)) { throw 'Build did not produce dist/index.html.' }
    } finally { Pop-Location }
  } finally {
    foreach ($name in ($scrubNames + $homeNames)) {
      [Environment]::SetEnvironmentVariable($name, $buildEnvironment[$name], 'Process')
    }
    $tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
    $resolvedHome = [System.IO.Path]::GetFullPath($isolatedHome)
    if ($resolvedHome.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -and
        (Split-Path -Leaf $resolvedHome) -cmatch "^portfolio-preview-home-$PullRequest-[0-9a-f]{32}$") {
      Remove-Item -LiteralPath $resolvedHome -Recurse -Force
    }
  }

  $freshPr = Get-DraftPullRequest -PullRequest $PullRequest
  if ($freshPr.headRefOid -cne $journal.headSha -or (Get-RemoteStagingSha) -cne $journal.baseSha) {
    throw 'PR head or staging moved during build. Re-plan.'
  }
  [Environment]::SetEnvironmentVariable('CLOUDFLARE_ACCOUNT_ID', $AccountId, 'Process')
  $null = Invoke-PreviewWrangler -Arguments @('whoami', '--json')
  if (Test-PreviewProjectExists -ProjectName $projectName) { throw "Cloudflare project $projectName already exists; refusing to adopt it." }
  if ($previousCleanedJournal) {
    $archive = Join-Path $paths.StateDirectory "pr-$PullRequest-$($previousCleanedJournal.headSha.Substring(0,12))-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds()).cleaned.json"
    Move-Item -LiteralPath $paths.Journal -Destination $archive
  }
  Save-PreviewJournal -Path $paths.Journal -Journal $journal
  $journal.phase = 'creation-requested'
  $journal | Add-Member -NotePropertyName creationRequestedAt -NotePropertyValue ([DateTimeOffset]::UtcNow.ToString('o')) -Force
  Save-PreviewJournal -Path $paths.Journal -Journal $journal
  $null = Invoke-PreviewWrangler -Arguments @('pages', 'project', 'create', $projectName, '--production-branch', $branch)
  $project = Get-PreviewProject -ProjectName $projectName
  if (-not $project -or -not $project.id -or $project.production_branch -cne $branch -or
      ($project.PSObject.Properties['source'] -and $project.source)) {
    throw 'Direct Upload project creation was not confirmed; retain journal and reconcile before retry.'
  }
  $journal | Add-Member -NotePropertyName projectId -NotePropertyValue $project.id
  $journal.phase = 'created'
  Save-PreviewJournal -Path $paths.Journal -Journal $journal

  $journal.phase = 'deploy-requested'
  Save-PreviewJournal -Path $paths.Journal -Journal $journal
  $null = Invoke-PreviewWrangler -Arguments @('pages', 'deploy', (Join-Path $worktree 'dist'), '--project-name', $projectName, '--branch', $branch, '--commit-hash', $journal.headSha, '--commit-message', "Draft PR #$PullRequest exact head")
  $deployment = $null
  for ($attempt = 0; $attempt -lt 12; $attempt++) {
    $deployedProject = Get-PreviewProject -ProjectName $projectName
    if (-not $deployedProject -or $deployedProject.id -cne $journal.projectId) {
      throw 'Owned Pages project disappeared or changed during deployment.'
    }
    $candidate = $deployedProject.canonical_deployment
    if ($candidate -and $candidate.deployment_trigger -and $candidate.deployment_trigger.metadata -and
        $candidate.deployment_trigger.metadata.commit_hash -ceq $journal.headSha) {
      if ($candidate.latest_stage.status -ceq 'failure') { throw 'The Pages preview deployment failed; retain journal for teardown.' }
      if ($candidate.latest_stage.status -ceq 'success') { $deployment = $candidate; break }
    }
    Start-Sleep -Seconds 2
  }
  if (-not $deployment -or $deployment.environment -cne 'production' -or
      $deployment.deployment_trigger.metadata.branch -cne $branch -or
      $deployment.url -cnotmatch "^https://[a-z0-9-]+\.$([regex]::Escape($projectName))\.pages\.dev$") {
    throw 'The exact PR head did not become an immutable successful Pages deployment; retain journal for teardown.'
  }
  $journal | Add-Member -NotePropertyName deploymentId -NotePropertyValue $deployment.id -Force
  $journal.previewUrl = $deployment.url
  $journal.phase = 'deployed'
  Save-PreviewJournal -Path $paths.Journal -Journal $journal
  $response = Invoke-WebRequest -Uri $journal.previewUrl -Method Head -SkipHttpErrorCheck -TimeoutSec 20
  if ([int]$response.StatusCode -ne 200 -or $response.Headers['X-Robots-Tag'] -notmatch 'noindex') {
    throw 'Preview did not serve HTTP 200 with X-Robots-Tag: noindex; retain journal for teardown.'
  }
  $freshPr = Get-DraftPullRequest -PullRequest $PullRequest
  if ($freshPr.headRefOid -cne $journal.headSha -or (Get-RemoteStagingSha) -cne $journal.baseSha) {
    throw 'PR head or staging moved during deployment. Tear down this preview and re-plan.'
  }
  Write-Output "preview-url=$($journal.previewUrl)"
  Write-Output "status=deployed; journal=$($paths.Journal)"
} finally {
  if ($worktreeAdded) {
    $resolvedTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
    $resolvedWorktree = [System.IO.Path]::GetFullPath($worktree)
    if (-not $resolvedWorktree.StartsWith($resolvedTemp, [StringComparison]::OrdinalIgnoreCase) -or
        (Split-Path -Leaf $resolvedWorktree) -cnotmatch "^portfolio-2026-pr-$PullRequest-[0-9a-f]{32}$") {
      Write-Warning "Temporary worktree path needs manual inspection: $worktree"
    } else {
      & git -C $paths.Root worktree remove --force $resolvedWorktree
      if ($LASTEXITCODE -ne 0) { Write-Warning "Temporary worktree needs manual cleanup: $worktree" }
    }
  }
  [Environment]::SetEnvironmentVariable('CLOUDFLARE_ACCOUNT_ID', $previousAccountId, 'Process')
}
} finally {
  $previewLock.Dispose()
}
