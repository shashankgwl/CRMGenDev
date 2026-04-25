# APIMMCP

Azure Functions API for lightweight Dataverse sales operations. The app is designed to sit behind Azure API Management and can be converted/exposed as an MCP server for agents such as Copilot Studio.

## What This API Does

The function app currently supports:

- Search a Dataverse contact by email.
- Create a Dataverse contact.
- Create a Dataverse opportunity.

The app uses the Dataverse Web API through managed identity. It does not store Dataverse secrets or client secrets.

## Project Structure

- `MCPTrigger.cs` - Azure Functions HTTP triggers and request validation.
- `DataverseService.cs` - Dataverse Web API client logic.
- `Program.cs` - Function worker startup and dependency injection.
- `host.json` - Azure Functions host configuration.
- `local.settings.json` - Local-only settings, ignored by git.
- `scripts/deploy-function.ps1` - Build, package, configure, and deploy helper.

## Requirements

- .NET 8 SDK.
- Azure Functions Core Tools v4 for local execution.
- Azure CLI for deployment.
- An Azure Function App.
- A Dataverse environment.
- A managed identity configured as a Dataverse application user.

## Configuration

### Local Settings

For local development, use `local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "DataverseUrl": "https://org1268a762.crm11.dynamics.com/",
    "ManagedIdentityClientId": ""
  }
}
```

`DataverseUrl` is required.

`ManagedIdentityClientId` is only required when using a user-assigned managed identity. Leave it blank or omit it for a system-assigned managed identity.

`FUNCTIONS_WORKER_RUNTIME=dotnet-isolated` is required locally because this is a .NET isolated worker app.

### Azure Function App Settings

Add these Function App settings in Azure:

```text
DataverseUrl = https://org1268a762.crm11.dynamics.com/
```

For a user-assigned managed identity, also add:

```text
ManagedIdentityClientId = <managed-identity-client-id>
```

For a system-assigned managed identity, do not set `ManagedIdentityClientId`.

Do not set `AzureWebJobsStorage` to blank in Azure. The Function App should have a real storage setting unless the hosting plan configuration explicitly does not require one.

### Flex Consumption Note

For Azure Functions Flex Consumption, do not add `FUNCTIONS_WORKER_RUNTIME` as an app setting. Flex stores runtime information in the Function App resource configuration and rejects this setting.

Keep `FUNCTIONS_WORKER_RUNTIME` in `local.settings.json` for local development only.

## Managed Identity And Dataverse Setup

1. Enable a system-assigned managed identity on the Function App, or assign a user-assigned managed identity.
2. Open Power Platform Admin Center.
3. Select the Dataverse environment.
4. Go to application users.
5. Add the Function App managed identity as an application user.
6. Assign Dataverse security roles that allow:
   - Read Contact.
   - Create Contact.
   - Read Opportunity.
   - Create Opportunity.
   - Append and Append To for linking Opportunity to Contact.

For a quick test, a broad role such as System Administrator can confirm connectivity. For real use, create a least-privilege Dataverse role.

## Endpoints

All routes are under the Azure Functions `/api` prefix unless changed by hosting or APIM.

### Search Contact By Email

```http
GET /api/contacts/search?email=test@example.com
```

or:

```http
POST /api/contacts/search
Content-Type: application/json

{
  "email": "test@example.com"
}
```

Success response:

```json
{
  "contactId": "00000000-0000-0000-0000-000000000000",
  "firstName": "Test",
  "lastName": "Person",
  "email": "test@example.com",
  "phoneNumber": "1234567890"
}
```

Returns `404` when no contact is found.

### Create Contact

```http
POST /api/contacts
Content-Type: application/json

{
  "firstName": "Test",
  "lastName": "Person",
  "email": "test@example.com",
  "phoneNumber": "1234567890"
}
```

Required:

- `firstName`
- `lastName`
- At least one of `email` or `phoneNumber`

Dataverse mappings:

- `firstName` -> `firstname`
- `lastName` -> `lastname`
- `email` -> `emailaddress1`
- `phoneNumber` -> `telephone1`

Success response:

```json
{
  "contactId": "00000000-0000-0000-0000-000000000000",
  "firstName": "Test",
  "lastName": "Person",
  "email": "test@example.com",
  "phoneNumber": "1234567890"
}
```

### Create Opportunity

```http
POST /api/opportunities
Content-Type: application/json

{
  "name": "Dummy opportunity",
  "parentContactId": "f765252b-6340-f111-bec6-6045bd0b0358",
  "budgetAmount": 50000,
  "estimatedValue": 75000,
  "estimatedCloseDate": "2026-06-30",
  "customerNeed": "Customer is looking for a Dataverse integration."
}
```

Required:

- `name`

Optional:

- `parentContactId`
- `budgetAmount`
- `estimatedValue`
- `estimatedCloseDate`
- `customerNeed`

Dataverse mappings:

- `name` -> `name`
- `parentContactId` -> `parentcontactid@odata.bind`
- `budgetAmount` -> `budgetamount`
- `estimatedValue` -> `estimatedvalue`
- `estimatedCloseDate` -> `estimatedclosedate`
- `customerNeed` -> `customerneed`

`estimatedCloseDate` must be sent by this app to Dataverse as a date-only value in `yyyy-MM-dd` format. The service converts the incoming `DateTime` value to the correct Dataverse `Edm.Date` payload format.

The account lookup field is intentionally not supported.

Success response:

```json
{
  "opportunityId": "00000000-0000-0000-0000-000000000000",
  "name": "Dummy opportunity",
  "parentContactId": "f765252b-6340-f111-bec6-6045bd0b0358",
  "budgetAmount": 50000,
  "estimatedValue": 75000,
  "estimatedCloseDate": "2026-06-30T00:00:00",
  "customerNeed": "Customer is looking for a Dataverse integration."
}
```

## Local Build

```powershell
dotnet build APIMMCP.csproj
```

## Local Run

```powershell
func start --port 7164
```

Local routes:

```text
http://localhost:7164/api/contacts/search
http://localhost:7164/api/contacts
http://localhost:7164/api/opportunities
```

Local Dataverse calls require credentials that can satisfy the configured Azure credential flow. The current service uses managed identity credentials, which are primarily intended for Azure-hosted execution.

## Deploy

Sign in:

```powershell
az login
```

Deploy to the existing Function App:

```powershell
.\scripts\deploy-function.ps1 `
  -ResourceGroup "ShashankTest" `
  -FunctionAppName "dataversemcp" `
  -DataverseUrl "https://org1268a762.crm11.dynamics.com/"
```

For user-assigned managed identity:

```powershell
.\scripts\deploy-function.ps1 `
  -ResourceGroup "ShashankTest" `
  -FunctionAppName "dataversemcp" `
  -DataverseUrl "https://org1268a762.crm11.dynamics.com/" `
  -ManagedIdentityClientId "<managed-identity-client-id>"
```

For non-Flex Function Apps where the worker runtime setting should be configured by app setting:

```powershell
.\scripts\deploy-function.ps1 `
  -ResourceGroup "ShashankTest" `
  -FunctionAppName "dataversemcp" `
  -DataverseUrl "https://org1268a762.crm11.dynamics.com/" `
  -IncludeWorkerRuntimeSetting
```

The script publishes to `artifacts/publish`, creates a zip file, updates Function App settings, and deploys using Azure CLI zip deployment.

## APIM And MCP Usage

This API is intended to be imported into Azure API Management and exposed as an MCP server. The OpenAPI descriptions should be explicit so MCP clients understand when to call each operation.

Recommended tool behavior for MCP clients:

- Search by email before creating a contact when an email address is available.
- Do not create duplicate contacts unless the user explicitly asks for that.
- Use the returned `contactId` as `parentContactId` when creating an opportunity for a contact.
- Do not ask for account lookup values. The API intentionally ignores account lookup.
- Convert natural language dates to `yyyy-MM-dd` before calling the API.
- Send money values as numbers, not strings.
- Never invent Dataverse IDs.

Example user task:

```text
Search for contact dummmycontact@gmail.com. If found, create an opportunity for this contact with the opportunity name Dummy Opportunity from Copilot, budget amount 50000, estimated revenue 75000, estimated close date 2026-06-30, and customer need Customer is evaluating a Dataverse integration and wants follow-up from sales.
```

## Troubleshooting

### Flex Consumption rejects FUNCTIONS_WORKER_RUNTIME

Remove `FUNCTIONS_WORKER_RUNTIME` from Azure Function App settings. Keep it only in `local.settings.json`.

### Dataverse rejects estimatedclosedate

Dataverse expects `estimatedclosedate` as `Edm.Date`, not a full DateTime. This app converts the value to `yyyy-MM-dd` before sending it to Dataverse.

### Dataverse rejects parentcontactid binding

The app currently uses:

```json
"parentcontactid@odata.bind": "/contacts(<contact-guid>)"
```

If Dataverse returns an undeclared property or navigation property error, confirm the exact Web API navigation property name for the Opportunity contact lookup in your environment.

### 401 or 403 from Dataverse

Confirm:

- The Function App managed identity is enabled.
- The same identity has been added as a Dataverse application user.
- The application user has Dataverse security roles with the required table privileges.

### 404 from contact search

No contact matched the supplied `emailaddress1` value.

## Security Notes

- Do not commit `local.settings.json`.
- Use managed identity instead of client secrets.
- Use least-privilege Dataverse security roles for production.
- Protect the API through APIM subscription keys or stronger authentication as needed.
