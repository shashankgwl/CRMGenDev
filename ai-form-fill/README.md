# Dataverse AI Autofill (Edge Extension)

Basic Microsoft Edge extension scaffold to autofill Dataverse forms using:
- OpenAI API
- Azure AI Foundry / Azure OpenAI chat endpoint

## What is included

- `manifest.json`: MV3 extension config.
- `src/contentScript.js`: Detects editable fields on Dataverse pages and applies AI-generated values.
- `src/background.js`: Handles provider config and calls AI endpoint.
- `src/popup.*`: Trigger autofill from extension popup.
- `src/options.*`: Configure OpenAI or Azure settings.

## Load in Edge

1. Open `edge://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.

## Configure

1. Open extension details -> **Extension options**.
2. Choose provider:
   - `OpenAI`: set API key and model.
   - `Azure`: set endpoint, deployment, API version, and key.

## Use

1. Open a Dataverse form page.
2. Open the extension popup.
3. Add optional context prompt.
4. Click **Autofill current Dataverse page**.

## Notes

- This is intentionally a starter scaffold.
- Dataverse fields can be dynamic/virtualized, so selector logic will likely need tuning per app.
- Add stronger prompt templates and field mapping rules before production use.
