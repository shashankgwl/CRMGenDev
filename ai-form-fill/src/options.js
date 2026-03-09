const DEFAULT_CONFIG = {
  azureApiKey: "",
  azureEndpoint: "",
  azureModel: "gpt-5.1",
  fillLockedFields: false,
  fillLookupFields: false
};

const statusEl = document.getElementById("status");
const saveBtn = document.getElementById("saveBtn");

const fields = {
  azureApiKey: document.getElementById("azureApiKey"),
  azureEndpoint: document.getElementById("azureEndpoint"),
  azureModel: document.getElementById("azureModel"),
  fillLockedFields: document.getElementById("fillLockedFields"),
  fillLookupFields: document.getElementById("fillLookupFields")
};

init().catch((error) => setStatus(error.message));

saveBtn.addEventListener("click", async () => {
  try {
    const payload = {};
    for (const [key, input] of Object.entries(fields)) {
      payload[key] = input.type === "checkbox"
        ? input.checked
        : input.value.trim();
    }

    await chrome.storage.sync.set(payload);
    setStatus("Saved.");
  } catch (error) {
    setStatus(error.message);
  }
});

async function init() {
  const data = await chrome.storage.sync.get([
    ...Object.keys(DEFAULT_CONFIG),
    "azureDeployment"
  ]);
  const merged = { ...DEFAULT_CONFIG, ...data };
  if (!merged.azureModel && merged.azureDeployment) {
    merged.azureModel = merged.azureDeployment;
  }

  for (const [key, input] of Object.entries(fields)) {
    if (input.type === "checkbox") {
      input.checked = Boolean(merged[key]);
      continue;
    }
    input.value = merged[key] || "";
  }
}

function setStatus(message) {
  statusEl.textContent = message;
}
