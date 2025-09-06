# PowerShell Script: Enable or Disable Workflows in Dataverse Solution
https://github.com/shashankgwl/CRMGenDev/blob/main/PowerShell/EnableDisableAllWorkflows.ps1

This PowerShell script automates the enabling or disabling of various workflow types within a specified Microsoft Dataverse solution. It supports the following workflow categories:

- **Business Rule** (category 2)
- **Custom Action** (category 3)
- **Business Process Flow (BPF)** (category 4)
- **Cloud Flow** (category 5)

## Parameters

- **SolutionIdentifier**: The GUID of the Dataverse solution whose workflows you want to manage.
- **EnvironmentId**: The GUID of the Power Platform environment.
- **Action**: Either `'Enable'` or `'Disable'` – determines whether workflows are enabled or disabled.
- **ClientId**, **RedirectUri**: OAuth parameters for authentication (default values provided; replace with your own for production).

## Workflow

1. **Module Checks & Imports**
   - The script checks for the presence of required modules (`Microsoft.Xrm.Tooling.CrmConnector.PowerShell` and `Microsoft.Xrm.Data.Powershell`). If missing, it prompts the user to install them.
   - The necessary modules are imported.

2. **Establish Connection**
   - Uses OAuth to connect to the Dataverse environment.
   - If connection fails, the script exits.

3. **Fetch Workflows**
   - Executes a FetchXML query to retrieve workflows of categories 2–5 from the specified solution.
   - Displays the number of workflows found.

4. **Process Each Workflow**
   - Iterates through each workflow record.
   - **Cloud Flows (category 5):**
     - Uses `Enable-AdminFlow` or `Disable-AdminFlow` cmdlets (with provided environment and flow names).
   - **Other Workflow Types (categories 2–4):**
     - Identifies the workflow type.
     - Uses `SetStateRequest` to update the workflow's state:
       - **Enable**: Sets state to enabled (statecode 1, statuscode 2).
       - **Disable**: Sets state to disabled (statecode 0, statuscode 1).
   - Prints status messages throughout for clarity.

5. **Error Handling**
   - If any errors occur during connection or processing, the script prints an error message and exits.

## Usage Example

```powershell
.\EnableDisableAllWorkflows.ps1 -SolutionIdentifier "your-solution-guid" -EnvironmentId "your-environment-guid" -Action "Enable"
```

Replace the GUIDs and authentication parameters as needed.

## Notes

- Make sure you have the required modules installed and are running with appropriate permissions.
- For Cloud Flows, ensure the `Enable-AdminFlow` and `Disable-AdminFlow` cmdlets are available.
- Default OAuth settings are provided, but you should substitute your own for production use.

## Summary

This script is a robust utility for bulk enabling or disabling Dataverse workflows in a solution, helping admins efficiently manage business rules, custom actions, BPFs, and cloud flows.
