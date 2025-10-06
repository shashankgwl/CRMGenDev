#this powershell script will unzip a solution file and use azure ai foundry endpoints to generate a solution documentation
#this powershell script will run as an AZURE devops pipeline task

param (
    [string]$solutionFilePath = ".\Solutions\EvolveSecurityRoles_1_0_0_15_managed.zip"
    # [string]$outputFilePath,
    # [string]$foundryEndpoint,
    # [string]$foundryApiKey
)

cls

if (-not (Test-Path $solutionFilePath)) {
    Write-Error "Solution file not found: $solutionFilePath"
    exit 1
}

function Invoke-AiFoundryEndpoint {
    param (
        [string]$BodyJson,
        [string]$foundryApiKey,
        [string]$foundryEndpoint
    )
    try {

        $headers = @{
            "api-key"      = $foundryApiKey
            "Content-Type" = "application/json"
        }

        Write-Host "making API call to $foundryEndpoint"

        $response = Invoke-RestMethod -Uri $foundryEndpoint -Method Post -Headers $headers -Body $BodyJson
        return $response.choices[0].message.content
    }
    catch {
        Write-Error "API call failed: $($_.Exception.Message)"
        if ($_.Exception.Response) {
            Write-Error "Status: $($_.Exception.Response.StatusCode.Value__)"
            Write-Error "Response: $($_.Exception.Response.Content.ReadAsStringAsync().Result)"
        }
    }
}

$solutionFolderPath = Split-Path -Path $solutionFilePath -Parent
#for each zip file in solutionFolderPAth, create a new folder as "Unzipped_<solutionfilename>" and unzip the solution there

foreach ($zipFile in Get-ChildItem -Path $solutionFolderPath -Filter *.zip) {
    $zipFileName = $zipFile.Name
    $childPath = "Unzipped_" + ($zipFileName -replace '\.zip$', '')
    $unzipFolderPath = Join-Path -Path $solutionFolderPath -ChildPath $childPath
    if (Test-Path $unzipFolderPath) {
        Remove-Item -Path $unzipFolderPath -Recurse -Force
    }
    New-Item -ItemType Directory -Path $unzipFolderPath | Out-Null
    Write-Host "Unzipping $zipFileName to $unzipFolderPath"
    Expand-Archive -Path $zipFile.FullName -DestinationPath $unzipFolderPath -Force
}

#for each unzipped folder, read the solution.xml and customizations.xml file
foreach ($unzipFolder in Get-ChildItem -Path $solutionFolderPath -Filter "Unzipped_*" -Directory) {
    $solutionXmlPath = Join-Path -Path $unzipFolder.FullName -ChildPath "solution.xml"
    $customizationsXmlPath = Join-Path -Path $unzipFolder.FullName -ChildPath "customizations.xml"

    if (-not (Test-Path $solutionXmlPath)) {
        Write-Error "solution.xml not found in $($unzipFolder.FullName)"
        continue
    }
    if (-not (Test-Path $customizationsXmlPath)) {
        Write-Error "customizations.xml not found in $($unzipFolder.FullName)"
        continue
    }

    $solutionXmlContent = Get-Content -Path $solutionXmlPath -Raw
    #we'll parse teh solutionXmlContent to get the solution name and version
    [xml]$solutionXml = $solutionXmlContent
    $solutionData = "Solution name is: " + $solutionXml.ImportExportXml.SolutionManifest.UniqueName + ", version is: " + $solutionXml.ImportExportXml.SolutionManifest.Version

    Write-Host "Solution XML data: $solutionData"



    [xml]$customizationsXmlContent = Get-Content -Path $customizationsXmlPath -Raw

    $roles = $customizationsXmlContent.ImportExportXml.Roles.Role

    write-Host "Found $(($roles).Count) roles in customizations.xml"
}

foreach ($role in $roles) {
    $roleName = $role.name  # Note: lowercase 'name' to match XML attribute
    $roleId = $role.id      # lowercase 'id'
    $privileges = $role.RolePrivileges.RolePrivilege  # Correct path: RolePrivileges.RolePrivilege
    Write-Host "Role: $roleName (ID: $roleId) has $($privileges.Count) privileges."

    #get all the privilege of the role in a comma separated string
    $privilegeNames = $privileges | ForEach-Object { $_.name + ":" + $_.level }
    $allPrivileges = $privilegeNames -join ", "
    Write-Host "Privileges: $allPrivileges"
    



    Write-Host "reached line 83"
    #read teh contents of the prompt.txt file
    $promptFilePath = ".\Solutions\prompt.txt"
    if (-not (Test-Path $promptFilePath)) {
        Write-Error "prompt.txt file not found: $promptFilePath"
        exit 1
    }
    Write-Host "reached line 90" 
    $promptTemplate = Get-Content -Path $promptFilePath -Raw
    #replace the {solutionfilexml} and {customizationsxml} placeholders in the prompt template with the actual xml contents, and write to prompt.txt file
    $finalPrompt = $promptTemplate -replace "\{solutionfilexml\}", [System.Text.RegularExpressions.Regex]::Escape($solutionData)
    $finalPrompt = $finalPrompt -replace "\{customizationxml\}", [System.Text.RegularExpressions.Regex]::Escape($allPrivileges)

    $finalPromptFilePath = Join-Path -Path $unzipFolder.FullName -ChildPath "finalprompt.txt"
    Set-Content -Path $finalPromptFilePath -Value $finalPrompt

    #read the keys.json file to get the foundry endpoint and api key
    $keysFilePath = ".\Solutions\keys.json"
    if (-not (Test-Path $keysFilePath)) {
        Write-Error "keys.json file not found: $keysFilePath"
        exit 1
    }
    $keysContent = Get-Content -Path $keysFilePath -Raw | ConvertFrom-Json
    $foundryEndpoint = $keysContent.AiFoundryEndpoint
    $foundryApiKey = $keysContent.AiFoundryKey

    if (-not $foundryEndpoint) {
        Write-Error "Foundry endpoint not found in keys.json"
        exit 1
    }
    if (-not $foundryApiKey) {
        Write-Error "Foundry API key not found in keys.json"
        exit 1
    }

    $systemPromptFilePath = ".\Solutions\systemprompt.txt"
    if (-not (Test-Path $systemPromptFilePath)) {
        Write-Error "prompt.txt file not found: $systemPromptFilePath"
        exit 1
    }
    $systemPromptTemplate = Get-Content -Path $systemPromptFilePath -Raw

    #now we'll send the finalPrompt to the foundry endpoint and get the response, we'll call our Invoke-AiFoundryEndpoint function
$body = @{
    messages = @(
        @{
            role    = "system"
            content = $systemPromptTemplate
        },
        @{
            role    = "user"
            content = $finalPrompt
        }
    )
    max_tokens  = 4000 
    temperature = 0.7
}

    Write-Host "reached line 140"
    $bodyJson = $body | ConvertTo-Json -Depth 6 -Compress
    Write-Host "reached line 143"
    Write-Host "Sending request to Foundry endpoint :" + $foundryEndpoint
    $response = Invoke-AiFoundryEndpoint -BodyJson $bodyJson -foundryApiKey $foundryApiKey -foundryEndpoint $foundryEndpoint
    #create a file to save the response
    $responseFilePath = Join-Path -Path $unzipFolder.FullName -ChildPath "AIResponse.html"
    Set-Content -Path $responseFilePath -Value $response
    exit 1
}





