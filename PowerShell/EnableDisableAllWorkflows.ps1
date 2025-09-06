# this powershell script enables or disables workflows of category 2(business rule), 3(custom action), 4(BPF), 5(cloud flows) in a specified Dataverse solution
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory = $false)]
    [string]$SolutionIdentifier = '76676b84-ee65-4c85-9253-27c49ca0bb63',

    [Parameter(Mandatory = $false)]
    [string]$EnvironmentId = '79f0289f-86b7-e9d5-99e1-8d5d5ab6b8ae',

    [ValidateSet('Disable', 'Enable')]
    [string]$Action = 'Disable', #ENABLE OR DISABLE

    # Optional: use your own Entra app values in production
    [string]$ClientId    = '51f81489-12ee-4a9e-aaae-a2591f45987d',
    [string]$RedirectUri = 'app://58145B91-0C36-4500-8554-080854F2AC97'
)

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

try {
    #$url = $EnvironmentUrl.TrimEnd('/')

    $connectionString = @(
        "AuthType=OAuth",
        "Url=https://YOURCRM.crm11.dynamics.com/",
        "AppId=$ClientId",
        "RedirectUri=$RedirectUri",
        "LoginPrompt=Auto",
        "RequireNewInstance=true"
    ) -join ';'

    $conn = Get-CrmConnection -ConnectionString $connectionString
    if (-not $conn -or -not $conn.IsReady) { throw "Connection to Dataverse failed." }

    # now we'll write fetchxml which gets records of dataverse workflow table of category 2(business rule), 3(custom action), 4(BPF), 5(cloud flows) in a specified Dataverse solution
    $fetchXml = @"
<fetch version='1.0' no-lock='true'>
  <entity name='workflow'>
    <attribute name='workflowid' />
    <attribute name='name' />
    <attribute name='category' />
    <attribute name='type' />
    <attribute name='statecode' />
    <attribute name='statuscode' />
    <link-entity name='solutioncomponent' from='objectid' to='workflowid' link-type='inner' alias='sc'>
      <attribute name='objectid' alias='flowid' />
      <filter>
        <condition attribute='solutionid' operator='eq' value='{$SolutionIdentifier}' />
        <condition attribute='componenttype' operator='eq' value='29' />
      </filter>
    </link-entity>
    <filter type="and">
      <condition attribute='category' operator='in'>
        <value>2</value>
        <value>3</value>
        <value>4</value>
        <value>5</value>
      </condition>
    </filter>
  </entity>
</fetch>

"@

    #$crmRecords = Get-CrmRecordsByFetch -Conn $conn -Fetch $fetchXml -WarningAction SilentlyContinue
    #$flowsInSolution = @($crmRecords.CrmRecords)
    $workflows = Get-CrmRecordsByFetch -Conn $conn -Fetch $fetchXml
    Write-Host "Trying fetchXML $fetchXml"
    Write-Host "Found $($workflows.CrmRecords.Count) workflows"

    

    # now in a loop we have to use Enable-AdminFlow or Disable-AdminFlow cmdlet to enable or disable the cloud flows, whereas for other 
    #workflow types we will use Set-CrmRecord cmdlet to set the statecode and statuscode attributes
    foreach ($workflow in $workflows.CrmRecords) {
        $name       = $workflow.name
        $id         = $workflow.workflowid
        $stateCode  = $workflow.statecode
        #$statusCode = [int]$workflow.statuscode
        $category   = $workflow.category

        if ($PSCmdlet.ShouldProcess("Workflow '$name' ($id)", "$Action")) {
            if ($category -eq 5) {
                # Cloud Flow
                if ($Action -eq 'Enable') {
                    Write-Output "Enabling Cloud Flow '$name' ($id)..."
                    #Enacble-AdminFlow -EnvironmentName $EnvironmentId -FlowName $flow.FlowName -ErrorAction Stop
                    Enable-AdminFlow -EnvironmentName $EnvironmentId -FlowName $workflow.FlowName -ErrorAction Stop
                    Write-Output "Cloud Flow '$name' enabled."
                } else {
                    Write-Output "Disabling Cloud Flow '$name' ($id)..."
                    #Disable-AdminFlow -EnvironmentName $EnvironmentId -FlowName $flow.FlowName -ErrorAction Stop
                    Disable-AdminFlow -EnvironmentName $EnvironmentId -FlowName $workflow.FlowName -ErrorAction Stop
                    Write-Output "Cloud Flow '$name' disabled."
                }
            } else {
                # Other workflow types (Business Rule, Custom Action, Business Process Flow)
                #we will now write what type of workflow it is

                if($category -eq 2) {
                    Write-Output "This is a Business Rule"
                } elseif ($category -eq 3) {
                    Write-Output "This is a Custom Action"
                } elseif ($category -eq 4) {
                    Write-Output "This is a Business Process Flow"
                } else {
                    Write-Output "This is an unknown type of workflow with category $category"
                }

                if ($Action -eq 'Enable') {
                    if ($stateCode -eq 1) {
                        Write-Output "Workflow '$name' is already enabled."
                    } else {
                        Write-Output "Enabling Workflow '$name' ($id)..."
                        $req = New-Object Microsoft.Crm.Sdk.Messages.SetStateRequest
                        $req.EntityMoniker = New-Object Microsoft.Xrm.Sdk.EntityReference('workflow', $id)
                        $req.State  = New-Object Microsoft.Xrm.Sdk.OptionSetValue(1)
                        $req.Status = New-Object Microsoft.Xrm.Sdk.OptionSetValue(2)
                        $null = $conn.ExecuteCrmOrganizationRequest($req)
                        Write-Output "Workflow '$name' enabled."
                    }
                } else {
                        Write-Output "Disabling this workflow"
                    if ($stateCode -eq 0) {
                        Write-Output "Workflow '$name' is already disabled."
                    } else {
                        Write-Output "Disabling Workflow '$name' ($id)..."
                        $req = New-Object Microsoft.Crm.Sdk.Messages.SetStateRequest
                        $req.EntityMoniker = New-Object Microsoft.Xrm.Sdk.EntityReference('workflow', $id)
                        $req.State  = New-Object Microsoft.Xrm.Sdk.OptionSetValue(0)
                        $req.Status = New-Object Microsoft.Xrm.Sdk.OptionSetValue(1)
                        $null = $conn.ExecuteCrmOrganizationRequest($req)
                        
                        Write-Output "Workflow '$name' disabled."
                    }
                }
            }
        }
    }
}
catch {
    Write-Error "Failed to connect: $($_.Exception.Message)"
    exit 1
}