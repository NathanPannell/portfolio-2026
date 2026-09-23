param(
  [ValidateRange(1, 2147483647)][int]$PullRequest,
  [switch]$Apply,
  [string]$AccountId,
  [string]$StateDirectory,
  [switch]$StagingVerified,
  [switch]$Abort,
  [switch]$Help
)

if ($Help) {
  Write-Output 'Usage: pwsh -File scripts/teardown-preview-pr.ps1 -PullRequest N [-Apply -AccountId 32_HEX_ID (-StagingVerified | -Abort)] [-StateDirectory ABSOLUTE_EXTERNAL_PATH]'
  Write-Output 'Default mode reads the owned external journal without Cloudflare calls. Normal apply requires merged PR, successful exact staging deployment, and completed staging browser QA. -Abort cleans an open or closed unmerged PR preview.'
  exit 0
}
if ($PullRequest -lt 1) { throw '-PullRequest is required.' }
. (Join-Path $PSScriptRoot 'preview-common.ps1')

$paths = Get-PreviewPaths -PullRequest $PullRequest -StateDirectory $StateDirectory
$previewLock = Enter-PreviewLock -PullRequest $PullRequest -StateDirectory $paths.StateDirectory
try {
Assert-PortfolioRepository
$journal = Read-PreviewJournal -Path $paths.Journal -PullRequest $PullRequest
Write-Output "preview-project=$($journal.projectName)"
Write-Output "head-sha=$($journal.headSha)"
Write-Output "phase=$($journal.phase)"
Write-Output "journal=$($paths.Journal)"
if (-not $Apply) {
  Write-Output 'mode=plan; no Cloudflare call was made'
  exit 0
}
if ($StagingVerified -eq $Abort) { throw 'Apply requires exactly one of -StagingVerified or -Abort.' }
Assert-AccountId -AccountId $AccountId
if ($journal.accountId -cne $AccountId.ToLowerInvariant()) { throw 'Cloudflare account does not match the owned preview journal.' }
if ($journal.phase -cnotin @('prepared','creation-requested','created','deploy-requested','deployed','delete-requested','cleaned')) {
  throw "Cannot teardown preview in phase '$($journal.phase)'."
}
if (-not (Get-Command npx.cmd -ErrorAction SilentlyContinue)) { throw 'npx.cmd is required.' }
$previousAccountId = [Environment]::GetEnvironmentVariable('CLOUDFLARE_ACCOUNT_ID', 'Process')
[Environment]::SetEnvironmentVariable('CLOUDFLARE_ACCOUNT_ID', $AccountId, 'Process')
try {
  $null = Invoke-PreviewWrangler -Arguments @('whoami', '--json')
  $prRaw = gh pr view $PullRequest --repo $script:PreviewRepository --json number,state,isDraft,baseRefName,mergedAt,mergeCommit,headRefOid
  if ($LASTEXITCODE -ne 0) { throw "Could not read PR #$PullRequest before teardown." }
  $pr = $prRaw | ConvertFrom-Json
  if ($pr.number -ne $PullRequest) { throw 'PR number differs from the preview journal.' }
  if ($Abort) {
    if ($pr.state -cnotin @('OPEN','CLOSED') -or $pr.mergedAt) {
      throw '-Abort is only for an unmerged PR.'
    }
  } else {
    if ($pr.state -cne 'MERGED' -or $pr.baseRefName -cne 'staging' -or
        -not $pr.mergedAt -or $pr.mergeCommit.oid -cnotmatch '^[0-9a-f]{40}$') {
      throw 'Normal teardown requires a PR merged into staging.'
    }
    $stagingSha = Get-RemoteStagingSha
    & git -C $paths.Root fetch --no-tags origin refs/heads/staging
    if ($LASTEXITCODE -ne 0 -or (& git -C $paths.Root rev-parse FETCH_HEAD).Trim() -cne $stagingSha) {
      throw 'Staging moved during verification; retry after the release settles.'
    }
    & git -C $paths.Root merge-base --is-ancestor $pr.mergeCommit.oid $stagingSha
    if ($LASTEXITCODE -ne 0) { throw 'The PR merge commit is not on current staging.' }
    $stagingProject = Get-PreviewProject -ProjectName 'portfolio-2026-staging'
    if (-not $stagingProject) { throw 'Staging Pages project is unavailable; keep the preview.' }
    $deployment = $stagingProject.canonical_deployment
    if ($stagingProject.production_branch -cne 'staging' -or
        $stagingProject.source.type -cne 'github' -or $deployment.environment -cne 'production' -or
        $deployment.deployment_trigger.metadata.branch -cne 'staging' -or
        $deployment.latest_stage.status -cne 'success' -or
        $deployment.deployment_trigger.metadata.commit_hash -cne $stagingSha) {
      throw 'Staging Pages has not successfully deployed the current staging SHA; keep the preview.'
    }
    $response = Invoke-WebRequest -Uri 'https://staging.nathanpannell.com/' -Method Head -SkipHttpErrorCheck -TimeoutSec 20
    if ([int]$response.StatusCode -ne 200 -or $response.Headers['X-Robots-Tag'] -notmatch 'noindex') {
      throw 'The stable staging domain is not healthy/noindex; keep the preview.'
    }
    $journal | Add-Member -NotePropertyName stagingSha -NotePropertyValue $stagingSha -Force
    $journal | Add-Member -NotePropertyName stagingDeploymentId -NotePropertyValue $deployment.id -Force
    $journal | Add-Member -NotePropertyName stagingVerifiedAt -NotePropertyValue ([DateTimeOffset]::UtcNow.ToString('o')) -Force
    Save-PreviewJournal -Path $paths.Journal -Journal $journal
  }
  $project = Get-PreviewProject -ProjectName $journal.projectName
  if ($project) {
    if ($project.name -cne $journal.projectName -or
        $project.production_branch -cne $journal.productionBranch -or
        $project.subdomain -cne "$($journal.projectName).pages.dev" -or
        @($project.domains | Where-Object { $_ -cne "$($journal.projectName).pages.dev" }).Count -gt 0 -or
        ($project.PSObject.Properties['source'] -and $project.source)) {
      throw 'Pages project identity differs from the owned Direct Upload project; refusing deletion.'
    }
    $recordedId = if ($journal.PSObject.Properties['projectId']) { $journal.projectId } else { $null }
    if (-not $recordedId) {
      if ($journal.phase -cne 'creation-requested' -or -not $project.id -or -not $project.created_on) {
        throw 'Project identity was not recorded; automatic reconciliation is unsafe.'
      }
      $requestedAt = [DateTimeOffset]::Parse($journal.creationRequestedAt)
      $createdAt = [DateTimeOffset]::Parse($project.created_on)
      if ($createdAt -lt $requestedAt.AddMinutes(-2) -or $createdAt -gt [DateTimeOffset]::UtcNow.AddMinutes(2)) {
        throw 'Project creation time does not match the journal request; refusing adoption.'
      }
      $journal | Add-Member -NotePropertyName projectId -NotePropertyValue $project.id -Force
      Save-PreviewJournal -Path $paths.Journal -Journal $journal
      $recordedId = $project.id
    }
    if ($project.id -cne $recordedId) { throw 'Pages project ID differs from the owned journal; refusing deletion.' }
    $journal.phase = 'delete-requested'
    Save-PreviewJournal -Path $paths.Journal -Journal $journal
    $null = Invoke-PreviewWrangler -Arguments @('pages', 'project', 'delete', $journal.projectName, '--yes')
  }
  $absent = 0
  for ($attempt = 0; $attempt -lt 10 -and $absent -lt 3; $attempt++) {
    if (Test-PreviewProjectExists -ProjectName $journal.projectName) { $absent = 0 } else { $absent++ }
    if ($absent -lt 3) { Start-Sleep -Seconds 2 }
  }
  if ($absent -lt 3) { throw 'Pages project is not consistently absent. Retain journal and retry exact teardown.' }
  $journal.phase = 'cleaned'
  $journal | Add-Member -NotePropertyName cleanedAt -NotePropertyValue ([DateTimeOffset]::UtcNow.ToString('o')) -Force
  Save-PreviewJournal -Path $paths.Journal -Journal $journal
  Write-Output "status=cleaned; project=$($journal.projectName); journal=$($paths.Journal)"
} finally {
  [Environment]::SetEnvironmentVariable('CLOUDFLARE_ACCOUNT_ID', $previousAccountId, 'Process')
}
} finally {
  $previewLock.Dispose()
}
