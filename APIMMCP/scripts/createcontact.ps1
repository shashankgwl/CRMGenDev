$functionKey = $env:DATAVERSE_MCP_FUNCTION_KEY
if ([string]::IsNullOrWhiteSpace($functionKey)) {
    throw "Set the DATAVERSE_MCP_FUNCTION_KEY environment variable before running this script."
}

$url = "https://dataversemcp-gwc4had4ekbeddcb.eastus2-01.azurewebsites.net/api/contacts?code=$functionKey"

$body = @{
    firstName   = "Test"
    lastName    = "Person"
    email       = "test.person@example.com"
    phoneNumber = "1234567890"
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri $url `
    -Method Post `
    -ContentType "application/json" `
    -Body $body

$response | Format-List
