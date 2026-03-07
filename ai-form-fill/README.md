# Dataverse AI Autofill (Edge Extension)

Edge extension to autofill Microsoft Dataverse forms using OpenAI or Azure AI Foundry.

## Features

- Autofills Dataverse fields using AI-generated values.
- Uses Dataverse Xrm form APIs for field discovery and value application (with DOM fallback).
- Skips field-level-security blocked fields.
- Optional checkbox to fill locked fields.
- Random fallback for empty optionset fields.
- Gear menu with:
  - `Settings`
  - `Disclaimer`

## Project Structure

- `manifest.json`: Extension manifest (MV3).
- `src/popup.*`: Main popup UI and trigger.
- `src/options.*`: Provider and behavior settings.
- `src/background.js`: AI request logic (OpenAI / Azure).
- `src/contentScript.js`: Orchestration on Dataverse page.
- `src/dataverseBridge.js`: In-page Xrm bridge logic.
- `src/disclaimer.html`: Disclaimer popup.

## Prerequisites

- Microsoft Edge (latest recommended).
- Access to a Dataverse environment.
- One provider:
  - OpenAI API key, or
  - Azure AI Foundry / Azure OpenAI endpoint + model + key.

## Manual Installation (Edge)

1. Open Edge and go to `edge://extensions`.
2. Turn on `Developer mode`.
3. Click `Load unpacked`.
4. Select this repository folder:
   - `.../ai-form-fill`
5. Confirm the extension appears in the list.

## Initial Setup

1. Click the extension icon in Edge toolbar.
2. Click the gear icon.
3. Select `Settings`.
4. Configure provider details.

### OpenAI Settings

- Provider: `OpenAI`
- `API key`
- `Model` (example: `gpt-4o-mini`)
- `Chat completions URL` (default: `https://api.openai.com/v1/chat/completions`)

### Azure Settings

- Provider: `Azure AI Foundry / Azure OpenAI`
- `Endpoint`:
  - Recommended base URL form:
    - `https://<resource>.openai.azure.com`
- `Model` (example: `gpt-5.1`)
- `API key`

Note: Azure requests are sent using the Responses API.

## How To Try The Plugin

1. Open a Dataverse form record page (`*.dynamics.com` / `*.powerapps.com`).
2. Open the extension popup.
3. Optional: enter context text (business scenario or data style).
4. Optional: check/uncheck `Fill locked fields`.
5. Click `Autofill current Dataverse page`.
6. Review the values before saving the record.

## Disclaimer

Use the gear menu -> `Disclaimer`.

Message shown:

`This is AI generated content. Please review before using.`

## Troubleshooting

- `Could not establish connection. Receiving end does not exist`
  - Refresh the Dataverse page and try again.
  - Ensure the URL matches `*.dynamics.com` or `*.powerapps.com`.

- Azure `400` / `404` errors
  - Recheck endpoint, model, and key.
  - Use the base endpoint URL if unsure.

- Fields not filled
  - Field may be field-level-security protected.
  - Field may be unsupported type or not present on the active form runtime context.
  - Some complex lookup scenarios may require explicit value objects.

## Development Note

After code changes, reload the extension from `edge://extensions` before retesting.
