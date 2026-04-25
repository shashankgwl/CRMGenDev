[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)]
    [string] $ResourceGroup = "ShashankTest",

    [Parameter(Mandatory)]
    [string] $FunctionAppName = "dataversemcp",

    [Parameter(Mandatory)]
    [string] $DataverseUrl,

    [string] $ManagedIdentityClientId,

    [string] $Configuration = "Release",

    [string] $ProjectPath = (Join-Path $PSScriptRoot "..\APIMMCP.csproj"),

    [string] $OutputRoot = (Join-Path $PSScriptRoot "..\artifacts\publish"),

    [switch] $AssignSystemIdentity,

    [switch] $IncludeWorkerRuntimeSetting,

    [switch] $SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Assert-Command {
    param(
        [Parameter(Mandatory)]
        [string] $Name
    )

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found on PATH."
    }
}

Assert-Command "az"
Assert-Command "dotnet"

$project = Resolve-Path $ProjectPath
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$publishDir = Join-Path $OutputRoot $timestamp
$zipPath = Join-Path $OutputRoot "APIMMCP-$timestamp.zip"

New-Item -ItemType Directory -Path $publishDir -Force | Out-Null

if (-not $SkipBuild) {
    dotnet restore $project
    dotnet publish $project --configuration $Configuration --output $publishDir --no-restore
}

Compress-Archive -Path (Join-Path $publishDir "*") -DestinationPath $zipPath -Force

$settings = @("DataverseUrl=$DataverseUrl")

if ($IncludeWorkerRuntimeSetting) {
    $settings += "FUNCTIONS_WORKER_RUNTIME=dotnet-isolated"
}

if (-not [string]::IsNullOrWhiteSpace($ManagedIdentityClientId)) {
    $settings += "ManagedIdentityClientId=$ManagedIdentityClientId"
}

if ($AssignSystemIdentity) {
    if ($PSCmdlet.ShouldProcess($FunctionAppName, "Assign system-managed identity")) {
        az functionapp identity assign `
            --resource-group $ResourceGroup `
            --name $FunctionAppName `
            --only-show-errors | Out-Null
    }
}

if ($PSCmdlet.ShouldProcess($FunctionAppName, "Set app settings")) {
    az functionapp config appsettings set `
        --resource-group $ResourceGroup `
        --name $FunctionAppName `
        --settings $settings `
        --only-show-errors | Out-Null
}

if ($PSCmdlet.ShouldProcess($FunctionAppName, "Deploy $zipPath")) {
    az functionapp deployment source config-zip `
        --resource-group $ResourceGroup `
        --name $FunctionAppName `
        --src $zipPath `
        --only-show-errors | Out-Null
}

Write-Host "Deployment complete."
Write-Host "Package: $zipPath"
