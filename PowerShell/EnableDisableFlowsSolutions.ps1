# first we'll get all the flows in the environment
$EnvironmentId = '43cecd50-6cdb-e953-9bba-be5d46e31aa5'
$SolutionId = '174b6e43-9c30-4291-88fd-a1cbbf24d1dd'
$url = 'https://YOURCRM.crm11.dynamics.com/'
$EnableOrDisable = 'Enable' # or 'Disable'
$allFlows = Get-AdminFlow -EnvironmentName $EnvironmentId
# Optional: use your own Entra app values in production
[string]$ClientId = '51f81489-12ee-4a9e-aaae-a2591f45987d'
[string]$RedirectUri = 'app://58145B91-0C36-4500-8554-080854F2AC97'

#now we write a fetchxml to get all the flows in a solution with solution id

$fetch = @"
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
        <condition attribute='solutionid' operator='eq' value='{$SolutionId}' />
        <condition attribute='componenttype' operator='eq' value='29' />
      </filter>
    </link-entity>
    <filter>
      <!-- Category = 5 means Cloud Flow -->
      <condition attribute='category' operator='eq' value='5' />
    </filter>
  </entity>
</fetch>
"@


$connectionString = @(
    "AuthType=OAuth",
    "Url=$url",
    "AppId=$ClientId",
    "RedirectUri=$RedirectUri",
    "LoginPrompt=Auto",
    "RequireNewInstance=true"
) -join ';'

$conn = Get-CrmConnection -ConnectionString $connectionString

$crmRecords = Get-CrmRecordsByFetch -Conn $conn -Fetch $fetch -WarningAction SilentlyContinue
$flowsInSolution = @($crmRecords.CrmRecords)

#now we'll loop through the flows in the $allFlows and see if they are in the solution
foreach ($flow in $allFlows) {
    $flowInSolution = $flowsInSolution | Where-Object { $_.name -eq $flow.DisplayName }
    if ($flowInSolution) {
        Write-Host "Flow '$($flow.DisplayName)' is in the solution. Current state: $($flow.State)"
        #now we can enable or disable the flow
        if ($EnableOrDisable -eq 'Enable') {
            #enable the flow
            Write-Host "Enabling flow '$($flow.DisplayName)'..."
            Enable-AdminFlow -EnvironmentName $EnvironmentId -FlowName $flow.FlowName -ErrorAction Stop
            Write-Host "Flow '$($flow.DisplayName)' enabled."
        } else {
            #disable the flow
            Write-Host "Disabling flow '$($flow.DisplayName)'..."
            Disable-AdminFlow -EnvironmentName $EnvironmentId -FlowName $flow.FlowName -ErrorAction Stop
            Write-Host "Flow '$($flow.DisplayName)' disabled."
        }
    } else {
        Write-Host "Flow '$($flow.DisplayName)' is NOT in the solution. Skipping..."
    }
}



