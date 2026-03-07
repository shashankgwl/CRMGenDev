# Dataverse AI Autofill (Edge Extension)

Edge extension to autofill Microsoft Dataverse forms using Azure AI Foundry deployed agent.

## Features

- Autofills Dataverse fields using AI-generated values.
- Uses Dataverse Xrm form APIs for field discovery and value application (with DOM fallback).
- Skips field-level-security blocked fields.
- Optional checkbox to fill locked fields.
- Random fallback for empty optionset fields.

## Prerequisites

- Microsoft Edge (latest recommended).
- Access to a Dataverse environment.
- Azure AI Foundry / Azure OpenAI (endpoint + model + key).

## Manual Installation (Edge)

1. Download installation zip file from https://github.com/shashankgwl/CRMGenDev/blob/main/ai-form-fill/manual-installation/ai-form-fill.zip
2. Unzip in a folder.
3. Open Edge and go to `edge://extensions`.
4. Turn on `Developer mode`.
5. Click `Load unpacked`.
   <img width="1136" height="323" alt="image" src="https://github.com/user-attachments/assets/39106378-e9e4-4442-beb4-10c584d2b566" />

6. Select the unzipped folder which contains the manifest and src.
   <img width="1037" height="332" alt="image" src="https://github.com/user-attachments/assets/ce01bd27-4c7f-4919-90cb-ff704d5a3511" />


10. Confirm the extension appears in the list.

<img width="876" height="176" alt="image" src="https://github.com/user-attachments/assets/2dd42164-35fc-420c-81b8-1d0ee932bc4f" />


## Initial Setup

1. **Click the extension icon in Edge toolbar and open the extension.**
   
   <img width="422" height="299" alt="image" src="https://github.com/user-attachments/assets/a40fe3f0-f39e-4f25-a111-b6521da0ae18" />

3. **Click the gear icon and select settings**
   
   <img width="385" height="276" alt="image" src="https://github.com/user-attachments/assets/90224ae1-23f1-46d8-a1f7-482aff12c01c" />
   
5. **Configure Azure details.**
   - Open azure ai foundry
   - Deploy a model of your choice (e.g. gpt-5, gpt 4 and 4.1 mini might give you higher token quota and work perfectly fine)
   - click on the model and endpoints as shown below   

<img width="1896" height="914" alt="image" src="https://github.com/user-attachments/assets/e34186fb-25bf-4946-b3aa-2fe8ecedc8aa" />



Note: Azure requests are sent using the Responses API.

## How To Try The Plugin

1. Open a Dataverse form record page (`*.dynamics.com` / `*.powerapps.com`).
2. Open the extension popup.
3. Optional: enter context text (business scenario or data style).
4. Optional: check/uncheck `Fill locked fields`.
5. Click `Autofill current Dataverse page`.
6. Review the values before saving the record.


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
