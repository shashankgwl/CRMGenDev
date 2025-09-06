# PowerShell Script: Enable or Disable Flows in a Solution
https://github.com/shashankgwl/CRMGenDev/blob/main/PowerShell/EnableDisableFlowsSolutions.ps1

This script helps you **enable or disable Power Automate flows** that are part of a specific solution in a Microsoft Power Platform environment (like Dynamics 365). Here’s how it works, step by step:

---

## 1. **Set Up Variables**
- `EnvironmentId`: The ID of the Power Platform environment you’re working in.
- `SolutionId`: The ID of the solution containing your flows.
- `url`: The URL to your CRM (Dynamics 365) environment.
- `EnableOrDisable`: Set to `'Enable'` or `'Disable'` to choose what you want to do.

```powershell
$EnvironmentId = '...'
$SolutionId = '...'
$url = 'https://YOURCRM.crm11.dynamics.com/'
$EnableOrDisable = 'Enable' # or 'Disable'
```

---

## 2. **Get All Flows in the Environment**
- Uses `Get-AdminFlow` to list **all flows** in the environment.

```powershell
$allFlows = Get-AdminFlow -EnvironmentName $EnvironmentId
```

---

## 3. **Set Up Authentication**
- Uses OAuth with a client ID and redirect URI (you should use your own in production).

---

## 4. **Build FetchXML Query**
- FetchXML is used to get **all cloud flows (`category = 5`)** in a given solution.
- Filters only flows that are linked to your specified solution.

---

## 5. **Connect to CRM**
- Creates a connection to your CRM using the connection string.

---

## 6. **Get Flows in the Solution**
- Fetches only those flows that are part of the specific solution using `Get-CrmRecordsByFetch`.

---

## 7. **Loop Through All Flows**
- Checks each flow to see if it’s in your solution.
- If it **is in the solution**:
  - Enables or disables the flow based on your choice (`EnableOrDisable`).
- If it **is NOT in the solution**:
  - Skips that flow.

```powershell
foreach ($flow in $allFlows) {
    $flowInSolution = $flowsInSolution | Where-Object { $_.name -eq $flow.DisplayName }
    if ($flowInSolution) {
        # Enable or disable the flow
        if ($EnableOrDisable -eq 'Enable') {
            Enable-AdminFlow ...
        } else {
            Disable-AdminFlow ...
        }
    } else {
        # Skip flows not in the solution
    }
}
```

---

## **Summary**

- **Purpose:** Bulk enable or disable flows that belong to a particular solution.
- **How:** Gets all flows, checks which are in your solution, then enables/disables them.
- **Why?** Useful for managing flows during deployment, upgrades, or maintenance.

---

**Tip:**  
- Replace the placeholder values with your actual environment and solution IDs.
- Make sure you have the right permissions to run these commands.
