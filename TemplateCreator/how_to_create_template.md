# 🧩 How to Design a Word Template for Use with the "Populate Word Template" Custom Connector

This guide explains how to design a Microsoft Word `.docx` template that works with your custom Azure Function (invoked via a Power Automate custom connector). The connector takes two inputs:
- A **Word `.docx` file** containing **content controls**
- A **JSON payload** containing values and arrays to populate the template

---

## ✅ What the Connector Does

Your custom connector:
- Accepts a `.docx` file (as binary content)
- Accepts a JSON payload as a `data` field
- Replaces Word **content controls** (tags) with matching values from the JSON
- Supports **repeating table rows** for dynamic lists (e.g., contacts)
- Returns the populated `.docx` file for download or further processing

---

## 🧱 Template Structure Overview

There are two types of placeholders your Word template can support:

| Type | Example | Purpose |
|------|---------|---------|
| **Simple field** | `name`, `accountnumber` | Single value replacement |
| **Repeater field** | `mycontacts[*].aryemail` | Table rows for array objects |

---

## 🛠 Step-by-Step Instructions

### Step 1: Enable the Developer Tab in Word

1. Open Microsoft Word
2. Go to `File` → `Options` → `Customize Ribbon`
3. Check the box for **Developer** tab
4. Click **OK**

---

### Step 2: Insert Content Controls

#### 🔹 For Simple Text Placeholders

1. Place the cursor where you want to insert the dynamic value (e.g., Name).
2. Click **Developer** → **Plain Text Content Control** (`Aa` icon).
3. Click **Properties**.
4. Set the **Tag** to the JSON field name (e.g., `name`, `accountnumber`).

> 💡 Only the **Tag** field is used — the Title or Display Name can be anything.

---

#### 🔁 For Repeating Table Rows (Repeaters)

1. Insert a table with one row (for header) and another row (for dynamic content).
2. Put individual "Plain text" controls for each column first.
3. **Select the entire row and add a repeater control**
4. See the image below.

   <img width="1261" height="731" alt="image" src="https://github.com/user-attachments/assets/1c2be635-530f-4195-b721-2d9d3f8df13e" />




##### Example Tags for Contacts Table

| Column        | Tag (inside repeater) |
|---------------|------------------------|
| First Name    | `aryfname`             |
| Last Name     | `arylname`             |
| Email         | `aryemail`             |
| Phone         | `aryphone`             |

---

## 🧪 Sample JSON Payload

The connector will replace controls based on the `tag` field, using the following format:

```json
{
  "name": "John Doe",
  "accountnumber": "123456789",
  "primarycontactid": "contact123",
  "address1_addresstypecode": "Home",
  "mycontacts": [
    {
      "aryfname": "John",
      "arylname": "Smith",
      "aryemail": "john.smith@example.com",
      "aryphone": "123-456-7890"
    },
    {
      "aryfname": "Jane",
      "arylname": "Doe",
      "aryemail": "jane.doe@example.com",
      "aryphone": "987-654-3210"
    }
  ]
}

