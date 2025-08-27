#Requires -Version 5.1
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory = $true)]
    [string]$SolutionIdentifier = '<solution GUID>',

    [Parameter(Mandatory = $true)]
    [string]$EnvironmentUrl = 'https://<YOUR CRM>.crm11.dynamics.com/',

    [ValidateSet('Disable', 'Enable')]
    [string]$Action = 'Enable', #ENABLE OR DISABLE

    # Optional: use your own Entra app values in production
    [string]$ClientId    = '51f81489-12ee-4a9e-aaae-a2591f45987d',
    [string]$RedirectUri = 'app://58145B91-0C36-4500-8554-080854F2AC97'
)

# --- Module checks ---
$missing = @()
if (-not (Get-Module -ListAvailable -Name Microsoft.Xrm.Tooling.CrmConnector.PowerShell)) { $missing += 'Microsoft.Xrm.Tooling.CrmConnector.PowerShell' }
if (-not (Get-Module -ListAvailable -Name Microsoft.Xrm.Data.Powershell))            { $missing += 'Microsoft.Xrm.Data.Powershell' }

if ($missing.Count -gt 0) {
    $install = ($missing | ForEach-Object { "Install-Module $_ -Scope CurrentUser -Force -AllowClobber" }) -join [Environment]::NewLine
    Write-Error ("Missing module(s): {0}. Install with:{1}{2}" -f ($missing -join ', '), [Environment]::NewLine, $install)
    exit 1
}

Import-Module Microsoft.Xrm.Tooling.CrmConnector.PowerShell -ErrorAction Stop
Import-Module Microsoft.Xrm.Data.Powershell            -ErrorAction Stop

# --- Connect using XRM Tooling (OAuth connection string) ---
try {
    $url = $EnvironmentUrl.TrimEnd('/')

    $connectionString = @(
        "AuthType=OAuth",
        "Url=$url",
        "AppId=$ClientId",
        "RedirectUri=$RedirectUri",
        "LoginPrompt=Auto",
        "RequireNewInstance=true"
    ) -join ';'

    $conn = Get-CrmConnection -ConnectionString $connectionString
    if (-not $conn -or -not $conn.IsReady) { throw "Connection to Dataverse failed." }
}
catch {
    Write-Error "Failed to connect: $($_.Exception.Message)"
    exit 1
}

try {
    # --- Resolve solution by GUID or unique name ---
    if ($SolutionIdentifier -match "^[0-9A-Fa-f]{8}-([0-9A-Fa-f]{4}-){3}[0-9A-Fa-f]{12}$") {
        $solution = Get-CrmRecord -Conn $conn -EntityLogicalName solution -Id $SolutionIdentifier -Fields solutionid, uniquename
    } else {
        $solution = Get-CrmRecord -Conn $conn -EntityLogicalName solution -FilterAttribute uniquename -FilterOperator eq -FilterValue $SolutionIdentifier -Fields solutionid, uniquename
    }

    if (-not $solution) { throw "Solution '$SolutionIdentifier' not found." }

    Write-Host "Target solution: $($solution.uniquename) ($($solution.solutionid))"

    # --- Fetch plug-in steps in the solution (solutioncomponent.componenttype = 92) ---
    $fetch = @"
<fetch version='1.0' no-lock='true'>
  <entity name='sdkmessageprocessingstep'>
    <attribute name='sdkmessageprocessingstepid' />
    <attribute name='name' />
    <attribute name='statecode' />
    <attribute name='statuscode' />
    <link-entity name='solutioncomponent' from='objectid' to='sdkmessageprocessingstepid' link-type='inner' alias='sc'>
      <attribute name='objectid' alias='stepid' />
      <filter>
        <condition attribute='solutionid' operator='eq' value='{$($solution.solutionid)}' />
        <condition attribute='componenttype' operator='eq' value='92' />
      </filter>
    </link-entity>
  </entity>
</fetch>
"@

    $stepsResult = Get-CrmRecordsByFetch -Conn $conn -Fetch $fetch -WarningAction SilentlyContinue
    $steps = @($stepsResult.CrmRecords)

    if (-not $steps -or $steps.Count -eq 0) {
        Write-Host "No plug-in steps found in the solution."
        return
    }

    Write-Host ("Found {0} plug-in step(s)." -f $steps.Count)

    # --- Desired state/status for sdkmessageprocessingstep (Enabled=(0,1), Disabled=(1,2)) ---
    if ($Action -eq 'Disable') {
        $desiredStateCode  = 1
        $desiredStatusCode = 2
    } else {
        $desiredStateCode  = 0
        $desiredStatusCode = 1
    }

    $changed = 0

    foreach ($step in $steps) {
        $name = $step['name']

        # Resolve GUID without any null-conditional or ternary operators
        $id = $null
        if ($step.PSObject.Properties['stepid'] -and $step.stepid) {
            $id = [Guid]$step.stepid
        } elseif ($step.PSObject.Properties['sdkmessageprocessingstepid'] -and $step.sdkmessageprocessingstepid) {
            $id = [Guid]$step.sdkmessageprocessingstepid
        } elseif ($step.PSObject.Properties['Id'] -and $step.Id) {
            $id = [Guid]$step.Id
        }

        if (-not $id) {
            Write-Warning "Skipping step (no id found): $name"
            continue
        }

        # Convert state/status to integers regardless of return type (int or OptionSetValue)
        $currentState  = $null
        $currentStatus = $null

        $stateRaw  = $step['statecode']
        $statusRaw = $step['statuscode']

        if ($stateRaw -is [int]) {
            $currentState = $stateRaw
        } elseif ($stateRaw) {
            if ($stateRaw.GetType().Name -eq 'OptionSetValue') {
                $currentState = $stateRaw.Value
            }
        }

        if ($statusRaw -is [int]) {
            $currentStatus = $statusRaw
        } elseif ($statusRaw) {
            if ($statusRaw.GetType().Name -eq 'OptionSetValue') {
                $currentStatus = $statusRaw.Value
            }
        }

        if (($currentState -eq $desiredStateCode) -and ($currentStatus -eq $desiredStatusCode)) {
            Write-Host ("Skipped (already {0}): {1}" -f $Action.ToLower(), $name)
            continue
        }

        if ($PSCmdlet.ShouldProcess("Step '$name' ($id)", "$Action")) {
            try {
                $req = New-Object Microsoft.Crm.Sdk.Messages.SetStateRequest
                $req.EntityMoniker = New-Object Microsoft.Xrm.Sdk.EntityReference('sdkmessageprocessingstep', $id)
                $req.State  = New-Object Microsoft.Xrm.Sdk.OptionSetValue($desiredStateCode)
                $req.Status = New-Object Microsoft.Xrm.Sdk.OptionSetValue($desiredStatusCode)
                $null = $conn.ExecuteCrmOrganizationRequest($req)

                Write-Host ("{0}d plug-in step: {1}" -f $Action.TrimEnd('e'), $name)
                $changed++
            }
            catch {
                Write-Warning ("Failed to {0} step '{1}': {2}" -f $Action.ToLower(), $name, $_.Exception.Message)
            }
        }
    }

    Write-Host ("Summary: {0} processed; {1} changed." -f $steps.Count, $changed)
}
catch {
    Write-Error "Error: $($_.Exception.Message)"
    exit 1
}
finally {
    if ($conn -is [System.IDisposable]) { $conn.Dispose() }
}
