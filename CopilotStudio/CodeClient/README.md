# Copilot Studio Console Client

This .NET console app connects to the published Copilot Studio agent `cr0b4_bilingualPoemCreator` in environment `Default-162b57d1-22cf-4a6e-b7a3-4d742c2ae518`.

The client follows the Microsoft Agents Copilot Studio console sample and uses interactive Microsoft Entra ID authentication through MSAL.

## How It Works

The app is a .NET Generic Host with one hosted service:

```text
Program.cs
	-> registers settings, HttpClient, CopilotClient, and ChatConsoleService
	-> host.Run()

.NET Host
	-> calls ChatConsoleService.StartAsync()

ChatConsoleService
	-> starts a Copilot Studio conversation
	-> reads user input from the console
	-> sends messages to the published Copilot Studio agent
	-> prints message, typing, event, attachment, and Adaptive Card responses

AddTokenHandler
	-> intercepts Copilot Studio HTTP requests
	-> gets a Power Platform API token with MSAL
	-> adds Authorization: Bearer <token>
```

The Copilot Studio agent remains hosted by Copilot Studio. This app is only a custom client for that agent.

## Prerequisites

- .NET SDK 8 or later.
- A published Copilot Studio agent.
- A Microsoft Entra public client/native app registration in the same tenant as the Copilot Studio agent.

## Entra App Registration

1. Open the Azure portal and go to Microsoft Entra ID.
2. Create a normal app registration for this console client. Do not use a Copilot Studio agent identity, agent blueprint, or the agent's own application/client ID here.
3. Choose **Accounts in this organizational directory only**.
4. Add a **Public client/native** redirect URI of `http://localhost`.
5. Record the **Directory (tenant) ID** and **Application (client) ID**.
6. Add API permission for **Power Platform API**.
7. Select delegated permission **CopilotStudio.Copilots.Invoke**.
8. Grant admin consent if your tenant requires it.

Service-to-service authentication is not used here because the upstream Copilot Studio sample notes that S2S is not currently supported for this path.

If sign-in shows `AADSTS82018: Response types other than none are not allowed for agent blueprints and agent Identities`, the configured `AppClientId` is the wrong kind of identity. Create or use a separate regular Entra app registration for this console client, configure it as a public/native client with `http://localhost`, add the Power Platform delegated permission, and put that app registration's Application client ID in `AppClientId`.

If sign-in fails with `AADSTS7000218` and says the request must contain `client_assertion` or `client_secret`, the app registration is being treated as a confidential/web client. Move `http://localhost` under **Mobile and desktop applications**, remove it from **Web** if needed, enable public client/native flows if the portal shows that option, save, and run again.

## Configure

Update `appsettings.json` with your tenant and app registration values:

```json
"TenantId": "<your-tenant-id>",
"AppClientId": "<your-public-client-app-id>"
```

The Copilot Studio agent values are already set:

```json
"EnvironmentId": "Default-162b57d1-22cf-4a6e-b7a3-4d742c2ae518",
"SchemaName": "cr0b4_bilingualPoemCreator"
```

## Build and Run

```powershell
dotnet restore
dotnet build
dotnet run
```

The first run opens an interactive browser sign-in. After login, type prompts at the `user>` prompt.

Example:

```text
Write a short bilingual poem in English and Hindi about spring.
```

Type `/exit` to quit.

## Adaptive Cards and Connector Consent

Some Copilot Studio topics or tools can return Adaptive Cards instead of plain text. For example, Work IQ/User MCP can send a card that says **Connect to continue** with **Allow** and **Cancel** buttons.

This console client extracts basic Adaptive Card content and turns submit actions into terminal choices:

```text
Actions:
	1. Allow
	2. Cancel
Type an action number or title to continue.
```

Type `1` or `Allow` to submit the Adaptive Card action back to Copilot Studio. The app sends the card's `Action.Submit` data through `CopilotClient.SendActivityAsync`.

## Authentication Notes

The current app uses delegated user authentication. On first run, MSAL opens a browser window and signs in the user. Later runs use the persisted MSAL token cache when possible.

Client ID and secret authentication is a different app-only flow. It only works if the Copilot Studio endpoint, tenant, agent, and connected tools support application permissions. User-specific connectors such as Work IQ/User MCP normally require delegated user context, so app-only auth may not satisfy those scenarios.

For a hosted ASP.NET or Node.js web app, prefer a user sign-in or On-Behalf-Of flow when the agent needs to act as the signed-in user.

## Dataverse Delegated Permissions

If the same app also calls Dataverse as the signed-in user, add the Dataverse/Dynamics CRM delegated permission separately. The Copilot Studio permission is for invoking agents; Dataverse Web API calls require a Dataverse-specific token audience, usually for your environment URL.

Typical pattern:

```text
Same Entra app registration
	-> Power Platform API / CopilotStudio.Copilots.Invoke for Copilot Studio
	-> Dynamics CRM / user_impersonation for Dataverse

Same signed-in user
	-> one access token for https://api.powerplatform.com
	-> another access token for https://<org>.crm.dynamics.com
```

## Troubleshooting

- `AADSTS82018`: `AppClientId` is likely an agent identity or blueprint app. Use a normal Entra public/native app registration.
- `AADSTS7000218`: the app registration is configured as a web/confidential client. Add `http://localhost` under **Mobile and desktop applications**.
- A single `.` after a prompt means the agent sent a `typing` activity. If no message follows, the app prints a no-content diagnostic.
- Adaptive Card JSON usually means the agent is asking for connector consent or another card action. Use the printed action number or title.
- Build errors about `CodeClient.exe` being locked mean a previous `dotnet run` process is still active. Exit the app with `/exit` or stop the process and build again.