# Copilot Studio Console Client

This .NET console app connects to the published Copilot Studio agent `cr0b4_bilingualPoemCreator` in environment `Default-162b57d1-22cf-4a6e-b7a3-4d742c2ae518`.

The client follows the Microsoft Agents Copilot Studio console sample and uses interactive Microsoft Entra ID authentication through MSAL.

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