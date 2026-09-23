Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:PreviewRepository = 'NathanPannell/portfolio-2026'
$script:PreviewWrangler = 'wrangler@4.136.3'
$script:PreviewAuthToken = $null

function Get-PreviewPaths {
  param([int]$PullRequest, [string]$StateDirectory)

  $root = (git rev-parse --show-toplevel).Trim()
  if ($LASTEXITCODE -ne 0 -or -not $root) { throw 'Run this script from the portfolio repository.' }
  $root = [System.IO.Path]::GetFullPath($root)
  if (-not $StateDirectory) {
    $localData = [Environment]::GetFolderPath('LocalApplicationData')
    if (-not $localData) { throw 'Set -StateDirectory to a durable directory outside the repository.' }
    $StateDirectory = Join-Path $localData 'Codex/portfolio-2026/pr-previews'
  }
  $state = [System.IO.Path]::GetFullPath($StateDirectory)
  if ($state.Equals($root, [StringComparison]::OrdinalIgnoreCase) -or
      $state.StartsWith($root + [System.IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'The preview journal must be outside the repository.'
  }
  return [pscustomobject]@{ Root = $root; StateDirectory = $state; Journal = (Join-Path $state "pr-$PullRequest.json") }
}

function Enter-PreviewLock {
  param([int]$PullRequest, [string]$StateDirectory)
  New-Item -ItemType Directory -Path $StateDirectory -Force | Out-Null
  $lockPath = Join-Path $StateDirectory "pr-$PullRequest.lock"
  try {
    return [System.IO.File]::Open($lockPath, [System.IO.FileMode]::OpenOrCreate,
      [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
  } catch {
    throw "Another preview operation holds the PR #$PullRequest lock at $lockPath."
  }
}

function Assert-PortfolioRepository {
  $name = (gh repo view --json nameWithOwner --jq '.nameWithOwner').Trim()
  if ($LASTEXITCODE -ne 0 -or $name -cne $script:PreviewRepository) {
    throw "Expected GitHub repository $script:PreviewRepository; got '$name'."
  }
}

function Get-DraftPullRequest {
  param([int]$PullRequest)
  $raw = gh pr view $PullRequest --repo $script:PreviewRepository --json number,url,state,isDraft,baseRefName,headRefOid,headRepository,headRepositoryOwner,mergeStateStatus
  if ($LASTEXITCODE -ne 0) { throw "Could not read PR #$PullRequest." }
  $pr = $raw | ConvertFrom-Json
  if ($pr.number -ne $PullRequest -or $pr.state -cne 'OPEN' -or -not $pr.isDraft -or $pr.baseRefName -cne 'staging') {
    throw "PR #$PullRequest must be open, draft, and target staging."
  }
  if ($pr.headRepository.name -cne 'portfolio-2026' -or $pr.headRepositoryOwner.login -cne 'NathanPannell') {
    throw 'The preview workflow only accepts same-repository pull requests.'
  }
  if ($pr.headRefOid -cnotmatch '^[0-9a-f]{40}$') { throw 'The PR head is not a full Git SHA.' }
  if ($pr.mergeStateStatus -ceq 'DIRTY') { throw 'The PR has a merge conflict with staging.' }
  return $pr
}

function Get-RemoteStagingSha {
  $line = git ls-remote origin refs/heads/staging
  if ($LASTEXITCODE -ne 0 -or $line -notmatch '^([0-9a-f]{40})\s+refs/heads/staging$') {
    throw 'Could not read the exact remote staging SHA.'
  }
  return $Matches[1]
}

function Assert-AccountId {
  param([string]$AccountId)
  if ($AccountId -cnotmatch '^[0-9a-fA-F]{32}$') { throw 'Apply requires a 32-character Cloudflare -AccountId.' }
}

function Invoke-PreviewWrangler {
  param([string[]]$Arguments)
  $output = & npx.cmd --yes --silent $script:PreviewWrangler @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) { throw "Wrangler $($Arguments -join ' ') failed: $($output -join [Environment]::NewLine)" }
  return ($output -join [Environment]::NewLine)
}

function ConvertFrom-PreviewJson {
  param([string]$Raw)
  try { return ConvertFrom-Json -InputObject $Raw }
  catch {
    $start = $Raw.IndexOf('{')
    $end = $Raw.LastIndexOf('}')
    if ($start -lt 0 -or $end -le $start) { throw 'Wrangler did not return a JSON object.' }
    return ConvertFrom-Json -InputObject $Raw.Substring($start, $end - $start + 1)
  }
}

function Get-PreviewProject {
  param([string]$ProjectName)
  $accountId = [Environment]::GetEnvironmentVariable('CLOUDFLARE_ACCOUNT_ID', 'Process')
  Assert-AccountId -AccountId $accountId
  if ($ProjectName -cne 'portfolio-2026-staging' -and
      $ProjectName -cnotmatch '^portfolio-2026-pr-[1-9][0-9]*-[0-9a-f]{12}-[0-9a-f]{8}$') {
    throw 'Refusing to query an unexpected Pages project name.'
  }
  if (-not $script:PreviewAuthToken) {
    $authRaw = Invoke-PreviewWrangler -Arguments @('auth', 'token', '--json')
    $auth = ConvertFrom-PreviewJson -Raw $authRaw
    if ($auth.type -cnotin @('oauth', 'api_token') -or -not $auth.token) {
      throw 'Wrangler authentication token is unavailable.'
    }
    $script:PreviewAuthToken = $auth.token
  }
  $uri = "https://api.cloudflare.com/client/v4/accounts/$accountId/pages/projects/$ProjectName"
  $status = 0
  $response = Invoke-RestMethod -Uri $uri -Method Get -Headers @{ Authorization = "Bearer $($script:PreviewAuthToken)" } -SkipHttpErrorCheck -StatusCodeVariable status
  if ($status -eq 404) {
    $inventory = @(Get-PreviewInventory -AccountId $accountId)
    if (@($inventory | Where-Object { $_.name -ceq $ProjectName }).Count -gt 0) {
      throw "Pages project $ProjectName appears in account inventory despite a direct 404."
    }
    return $null
  }
  if ($status -ne 200 -or -not $response.success -or $response.result.name -cne $ProjectName) {
    throw "Could not verify Pages project $ProjectName (HTTP $status)."
  }
  return $response.result
}

function Get-PreviewInventory {
  param([string]$AccountId)
  $all = [System.Collections.Generic.List[object]]::new()
  $page = 1
  do {
    $uri = "https://api.cloudflare.com/client/v4/accounts/$AccountId/pages/projects?page=$page"
    $status = 0
    $response = Invoke-RestMethod -Uri $uri -Method Get -Headers @{ Authorization = "Bearer $($script:PreviewAuthToken)" } -SkipHttpErrorCheck -StatusCodeVariable status
    if ($status -ne 200 -or -not $response.success -or -not $response.result_info -or
        -not $response.PSObject.Properties['result']) {
      throw "Could not verify full Pages account inventory (HTTP $status)."
    }
    foreach ($project in @($response.result)) { if ($project) { $all.Add($project) } }
    $totalPages = [int]$response.result_info.total_pages
    if ($totalPages -lt 1 -or $page -gt $totalPages) { throw 'Pages account inventory pagination is invalid.' }
    $page++
  } while ($page -le $totalPages)
  return $all.ToArray()
}

function Test-PreviewProjectExists {
  param([string]$ProjectName)
  return [bool](Get-PreviewProject -ProjectName $ProjectName)
}

function Save-PreviewJournal {
  param([string]$Path, [object]$Journal)
  $parent = Split-Path -Parent $Path
  New-Item -ItemType Directory -Path $parent -Force | Out-Null
  $temporary = "$Path.$([guid]::NewGuid().ToString('N')).tmp"
  try {
    $Journal.updatedAt = [DateTimeOffset]::UtcNow.ToString('o')
    $Journal | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $temporary -Encoding utf8NoBOM
    Move-Item -LiteralPath $temporary -Destination $Path -Force
  } finally {
    if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force }
  }
}

function Read-PreviewJournal {
  param([string]$Path, [int]$PullRequest)
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "No preview journal exists at $Path." }
  $journal = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
  if ($journal.schema -cne 'portfolio-2026.preview-pr/v1' -or
      $journal.repository -cne $script:PreviewRepository -or
      $journal.pullRequest -ne $PullRequest -or
      $journal.projectName -cnotmatch "^portfolio-2026-pr-$PullRequest-[0-9a-f]{12}-[0-9a-f]{8}$" -or
      $journal.headSha -cnotmatch '^[0-9a-f]{40}$' -or
      $journal.baseSha -cnotmatch '^[0-9a-f]{40}$' -or
      $journal.previewId -cnotmatch '^[0-9a-f]{8}$' -or
      $journal.projectName -cne "portfolio-2026-pr-$PullRequest-$($journal.headSha.Substring(0,12))-$($journal.previewId)" -or
      $journal.productionBranch -cne "pr-$PullRequest" -or
      $journal.accountId -cnotmatch '^[0-9a-fA-F]{32}$') {
    throw 'Preview journal identity is invalid; refusing provider mutation.'
  }
  if ($journal.phase -cin @('creation-requested','created','deploy-requested','deployed','delete-requested')) {
    if (-not $journal.PSObject.Properties['creationRequestedAt']) {
      throw 'Preview journal creation time is missing; refusing provider mutation.'
    }
    try { $null = [DateTimeOffset]::Parse($journal.creationRequestedAt) }
    catch { throw 'Preview journal creation time is invalid; refusing provider mutation.' }
  }
  return $journal
}
