# Copilot Studio Console Client

This .NET console app connects to the published Copilot Studio agent `cr0b4_bilingualPoemCreator` in environment `Default-162b57d1-22cf-4a6e-b7a3-4d742c2ae518`.

The client follows the Microsoft Agents Copilot Studio console sample.

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
	-> gets a Power Platform API token
	-> adds Authorization: Bearer <token>
```

The Copilot Studio agent remains hosted by Copilot Studio. This app is only a custom client for that agent.

## Prerequisites

- .NET SDK 8 or later.
- A published Copilot Studio agent.
- Valid API authentication credentials.

## Configure

Update `appsettings.json` with your authentication values:

```json
"AuthenticationSettings": {
  "ClientId": "<your-client-id>",
  "TenantId": "<your-tenant-id>"
}
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

The first run authenticates the user. After authentication, type prompts at the `user>` prompt.

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

The app uses authentication to access the Copilot Studio agent. Ensure your credentials are properly configured in `appsettings.json` before running.

For a hosted ASP.NET or Node.js web app, configure authentication appropriately for your hosting environment.

## Troubleshooting

- A single `.` after a prompt means the agent sent a `typing` activity. If no message follows, the app prints a no-content diagnostic.
- Adaptive Card JSON usually means the agent is asking for connector consent or another card action. Use the printed action number or title.
- Build errors about `CodeClient.exe` being locked mean a previous `dotnet run` process is still active. Exit the app with `/exit` or stop the process and build again.
