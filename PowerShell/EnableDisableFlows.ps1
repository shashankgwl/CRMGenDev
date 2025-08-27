$EnvironmentId       = '43cecd50-6cdb-e953-9bba-be5d46e31aa5'

# ON to enable flows, OFF to disable
$Action = 'On'   # 'On' or 'Off'
#$WhatIf = $false  # $true = dry run

# ── Sign in interactively ───────────────────────────────────────────────────
Import-Module Microsoft.PowerApps.Administration.PowerShell
Add-PowerAppsAccount -Endpoint "PROD" | Out-Null

$flowList = @"
flow1name,
flow2name,
flow3name
"@

$allFlows = Get-AdminFlow -EnvironmentName $EnvironmentId
Write-Host "Found $($allFlows.Count) flow(s) in environment '$EnvironmentId'." -ForegroundColor Cyan

foreach ($flow in $flowList.Split(",")) {
    $flow = $flow.Trim()
    $filteredFlows = $allFlows | Where-Object { $_.DisplayName -like "*$flow*" }
    if($filteredFlows.Count -eq 0) {
        Write-Warning "No flows found matching '$flow'."
        continue
    }

    $currentFlow = $filteredFlows[0]
    Write-Host "Processing flow: $($currentFlow.DisplayName)" -ForegroundColor Yellow

    if ($Action -eq 'Off') {
        Disable-AdminFlow -EnvironmentName $EnvironmentId -FlowName $currentFlow.FlowName -ErrorAction Stop
        Write-Host "Flow '$($currentFlow.DisplayName)' disabled." -ForegroundColor Green
    }
    else {
        Enable-AdminFlow -EnvironmentName $EnvironmentId -FlowName $currentFlow.FlowName -ErrorAction Stop
        Write-Host "Flow '$($currentFlow.DisplayName)' enabled." -ForegroundColor Green
    }
}
