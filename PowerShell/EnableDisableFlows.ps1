$EnvironmentId       = '43cecd50-6cdb-e953-9bba-be5d46e31aa5'

# ON to enable flows, OFF to disable
$Action = 'On'   # 'On' or 'Off'
#$WhatIf = $false  # $true = dry run

# ── Sign in interactively ───────────────────────────────────────────────────
Import-Module Microsoft.PowerApps.Administration.PowerShell
Add-PowerAppsAccount -Endpoint "PROD" | Out-Null

$flowList = @"
Automated monthly Gift Aid Process Flow, MNDA_Account_Update - Map District and Geographical Regions on Postcode Population., 
MNDA_Adjustment_Download XLedger Template File, 
MNDA_Contact_DataRetention, MNDA_Contact_Update - Map District and Geographical Regions on Postcode Population., 
MNDA_CreateAdjustment_OnUpdateOfTransaction, 
MNDA_PostCodeDistricts_Update - OnChange Update Related Account, 
MNDA_PostCodeDistricts_Update - OnChange Update Related Contact, 
MNDA_Transaction - BulkCreateSoftCredits, 
MNDA_Transaction_CalculateNoOfDonorsOnAppeals, 
MNDA_Transaction_OnCreateorUpdate_SetTransactionThankingLookup, 
MNDA_Transaction_Update - OnChange Of Amount Update All Child SoftCredit Transactions, 
MNDA_UpdateTransactionThankingEmailSentAcknowledgement,
Direct Debit Run Updater Child Flow,
Direct Debit Submission Updater Recurring,
Direct Debits -> Schedule -> Processing Cancelations.,
Import File,
KDNFP : ADDACS Response Trigger,
KDNFP : ARUDD Response Trigger,
KDNFP : ARUDD Reversal Trigger,
KDNFP : AUDDIS Response Trigger,
KDNFP : BACS Report Child Flow,
KDNFP : ChildFlow-> Set Giving Level,
KDNFP : Direct Debit Lodgement Trigger,
KDNFP : Direct Debit Lodgement Updater,
KDNFP : Direct Debit Representation to BACS,
KDNFP : Direct Debit Submission to BACS,
KDNFP : Giving Level -> Recalculate and Update (Account),
KDNFP : Giving Level -> Recalculate and Update (Contact),
KDNFP : Payment Schedule Updater Trigger,
KDNFP : Process Gift Batch,
KDNFP : Scheduled -> Call Yearly Giving Calculation Full,
KDNFP : Scheduled -> Call Performance Calculation,
KDNFP : Transaction > Auto Create Designated Credit,
KDNFP : Transaction > Auto Create Soft Credit,
KDNFP : Transaction Reversal,
KDNFP : Trigger Transaction Batch Updater,
KDNFP : Update GiftAidTransactionId on Transaction,
KDNFP : Update Reversed By on Transaction,
KDNFP: Update the Default Configuration,
KDNFP: Validate Gift Aid Declaration - OnCreate,
KDNFP: Validate Gift Aid Declaration (Child Flow),
KDFNP: Yearly-Giving-On-Demand,
KDFNP: Trigger DD Run Checker When Payment Run Completed,
KDFNP: Set NextPayment Null on PS Completion/Cancellation Pipeline Chainer Run Gift Aid,
Pipeline Chainer,
Run Gift Aid,
Set Name (Preference) → Donor Full Name: Objective,
Set Name (Third Party System Reference) → Constituent Full Name: Third Party System,
Trigger - Generic DataMill Pipeline (Child Flow),
KDNFP : Record Gift Aid,
KDNFP : Record Gift Aid -> Claim,
KDNFP : Record Gift Aid -> Full Reversal,
KDNFP : Record Gift Aid -> Partial Reversal,
PowerApp -> Record Gift Aid,
PowerPage -> Capture Transaction Modification,
PowerPage -> Capture Transaction Reversal,
PowerThings > Datamill > Run Pipeline Input,
PowerThings > Datamill > Trigger Pipeline
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