# PowerShell Script: Enable or Disable Power Automate Flows in an Environment
https://github.com/shashankgwl/CRMGenDev/blob/main/PowerShell/EnableDisableFlows.ps1

This PowerShell script allows you to **enable** or **disable** specific Power Automate flows within a given Microsoft Power Platform environment. It utilizes the `Microsoft.PowerApps.Administration.PowerShell` module to interact with flows administratively.

---

## How It Works

### 1. **Configuration**
- **Environment ID:**  
  Set the `$EnvironmentId` variable to the GUID of your target environment.
- **Action:**  
  Set `$Action` to `'On'` to enable flows or `'Off'` to disable flows.

### 2. **Authenticate**
- The script imports the required PowerShell module and prompts you to sign in interactively to your Power Platform admin account using `Add-PowerAppsAccount`.

### 3. **Specify Flows**
- List the flow names you want to process in the `$flowList` variable, separated by commas.

### 4. **Retrieve All Flows**
- It fetches all flows in the specified environment using `Get-AdminFlow`.

### 5. **Iterate Through Specified Flows**
- For each flow name in your list:
  - It searches for flows whose display name matches (contains) the specified name.
  - If found, it processes the first matching flow:
    - If `$Action` is `'Off'`, it disables the flow using `Disable-AdminFlow`.
    - If `$Action` is `'On'`, it enables the flow using `Enable-AdminFlow`.
  - Provides feedback in the console for each operation.

---

## Usage Example

1. **Update Variables:**  
   Change `$EnvironmentId`, `$Action`, and `$flowList` to match your environment and the flows you want to manage.
2. **Run Script:**  
   Execute the script in a PowerShell window.

---

## Notes

- **Interactive Login:**  
  You must have the necessary admin permissions in the target environment.
- **Flow Matching:**  
  The script matches flows by display name using a partial string match (`-like "*$flow*"`).
- **Error Handling:**  
  If a flow name is not found, a warning is displayed.

---

## Script Reference

```powershell
# Key steps in the script
Import-Module Microsoft.PowerApps.Administration.PowerShell
Add-PowerAppsAccount -Endpoint "PROD"
Get-AdminFlow -EnvironmentName $EnvironmentId
Enable-AdminFlow / Disable-AdminFlow -EnvironmentName $EnvironmentId -FlowName ...
```

---

## Customization

- **Dry Run Option:**  
  Uncomment and set `$WhatIf = $true` for a dry run (not enabled in the provided script).
- **Flow Matching Logic:**  
  Adjust the flow matching if your naming conventions require exact or different partial matches.

---

**Summary:**  
This script is a handy tool for administrators to bulk enable or disable flows in a Power Platform environment, saving manual effort and ensuring consistency.