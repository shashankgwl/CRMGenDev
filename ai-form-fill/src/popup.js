const statusEl = document.getElementById("status");
const contextEl = document.getElementById("context");
const autofillBtn = document.getElementById("autofillBtn");
const settingsToggleEl = document.getElementById("settingsToggle");
const gearMenuEl = document.getElementById("gearMenu");
const menuSettingsBtnEl = document.getElementById("menuSettingsBtn");
const menuDisclaimerBtnEl = document.getElementById("menuDisclaimerBtn");
const fillLockedFieldsEl = document.getElementById("fillLockedFields");
const fillLookupFieldsEl = document.getElementById("fillLookupFields");

init().catch((error) => setStatus(error.message));

autofillBtn.addEventListener("click", async () => {
  setStatus("Running autofill...");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      throw new Error("No active tab found.");
    }

    if (!isSupportedUrl(tab.url || "")) {
      throw new Error("Open a Dataverse page (*.dynamics.com or *.powerapps.com) and try again.");
    }

    const fillLockedFields = fillLockedFieldsEl.checked;
    const fillLookupFields = fillLookupFieldsEl.checked;
    await chrome.storage.sync.set({ fillLockedFields, fillLookupFields });

    const response = await sendAutofillMessage(
      tab.id,
      contextEl.value.trim(),
      fillLockedFields,
      fillLookupFields
    );

    if (!response?.ok) {
      throw new Error(response?.error || "Autofill failed.");
    }

    setStatus(`Updated ${response.result.updated} of ${response.result.detected} fields.`);
  } catch (error) {
    setStatus(error.message);
  }
});

settingsToggleEl.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleGearMenu();
});

menuSettingsBtnEl.addEventListener("click", async () => {
  try {
    closeGearMenu();
    const url = chrome.runtime.getURL("src/options.html");
    await chrome.windows.create({
      url,
      type: "popup",
      width: 860,
      height: 760
    });
  } catch (error) {
    chrome.runtime.openOptionsPage();
  }
});

menuDisclaimerBtnEl.addEventListener("click", async () => {
  try {
    closeGearMenu();
    const url = chrome.runtime.getURL("src/disclaimer.html");
    await chrome.windows.create({
      url,
      type: "popup",
      width: 420,
      height: 220
    });
  } catch (error) {
    setStatus("An AI copilot has been used in generating lot of code. Please review before using.");
  }
});

document.addEventListener("click", () => {
  closeGearMenu();
});

function setStatus(message) {
  statusEl.textContent = message;
}

async function sendAutofillMessage(tabId, context, fillLockedFields, fillLookupFields) {
  const message = {
    type: "RUN_AUTOFILL",
    context,
    fillLockedFields,
    fillLookupFields
  };

  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    if (!isMissingReceiverError(error)) {
      throw error;
    }

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["src/contentScript.js"]
    });

    return chrome.tabs.sendMessage(tabId, message);
  }
}

function isSupportedUrl(url) {
  return /^https:\/\/[^/]*\.(dynamics\.com|powerapps\.com)\//i.test(url);
}

function isMissingReceiverError(error) {
  const text = String(error?.message || error || "");
  return text.includes("Receiving end does not exist");
}

function toggleGearMenu() {
  const hidden = gearMenuEl.classList.toggle("hidden");
  gearMenuEl.setAttribute("aria-hidden", hidden ? "true" : "false");
}

function closeGearMenu() {
  if (gearMenuEl.classList.contains("hidden")) return;
  gearMenuEl.classList.add("hidden");
  gearMenuEl.setAttribute("aria-hidden", "true");
}

async function init() {
  const config = await chrome.storage.sync.get(["fillLockedFields", "fillLookupFields"]);
  fillLockedFieldsEl.checked = Boolean(config.fillLockedFields);
  fillLookupFieldsEl.checked = Boolean(config.fillLookupFields);
}
