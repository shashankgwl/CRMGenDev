chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "RUN_AUTOFILL") {
    return false;
  }

  runAutofill(message.context, {
    fillLockedFields: Boolean(message.fillLockedFields)
  })
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

async function runAutofill(context, options) {
  const bridgeReady = await ensureBridgeInjected();
  const formInfo = bridgeReady ? await collectDataverseFormViaBridge() : null;
  const fields = normalizeFieldsForAi(formInfo?.fields || collectFields());

  if (fields.length === 0) {
    throw new Error("No editable fields found on this page.");
  }

  const response = await chrome.runtime.sendMessage({
    type: "GENERATE_FIELD_VALUES",
    payload: {
      context,
      fields,
      dataverse: formInfo
    }
  });

  if (!response?.ok) {
    throw new Error(response?.error || "AI generation failed.");
  }

  let updates = 0;
  let skipped = [];
  if (bridgeReady) {
    const applyResult = await applyViaBridge(response.data, options);
    updates = applyResult?.updated || 0;
    skipped = applyResult?.skipped || [];
  } else {
    updates = applyValues(response.data, Boolean(options?.fillLockedFields));
  }

  return {
    detected: fields.length,
    updated: updates,
    skipped
  };
}

function normalizeFieldsForAi(fields) {
  return fields.map((f) => ({
    id: f.id || f.key || f.logicalName || "",
    name: f.name || f.logicalName || "",
    label: f.label || "",
    type: f.type || "text"
  }));
}

function collectFields() {
  const all = Array.from(
    document.querySelectorAll("input, textarea, select")
  ).filter(isEditable);

  return all.map((el) => {
    const label = findLabel(el);
    return {
      id: el.id || "",
      name: el.name || "",
      label,
      type: normalizeType(el)
    };
  });
}

function isEditable(el) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") return false;
  if (el.getAttribute("readonly") !== null) return false;
  if (el instanceof HTMLInputElement) {
    const blocked = ["hidden", "button", "submit", "reset", "checkbox", "radio", "file"];
    if (blocked.includes((el.type || "").toLowerCase())) return false;
  }

  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  return true;
}

function findLabel(el) {
  const fromLabelFor = el.id
    ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)
    : null;
  if (fromLabelFor?.textContent) return fromLabelFor.textContent.trim();

  const parentLabel = el.closest("label");
  if (parentLabel?.textContent) return parentLabel.textContent.trim();

  const aria = el.getAttribute("aria-label");
  if (aria) return aria.trim();

  const placeholder = el.getAttribute("placeholder");
  if (placeholder) return placeholder.trim();

  return "";
}

function normalizeType(el) {
  if (el instanceof HTMLTextAreaElement) return "textarea";
  if (el instanceof HTMLSelectElement) return "select";
  if (el instanceof HTMLInputElement) return el.type || "text";
  return "text";
}

function applyValues(valuesByFieldKey, includeLockedFields) {
  let updated = 0;
  const fields = Array.from(document.querySelectorAll("input, textarea, select"))
    .filter((el) => (includeLockedFields ? isPotentiallyFillable(el) : isEditable(el)));

  for (const el of fields) {
    const key = el.id || el.name;
    if (!key) continue;
    const newValue = valuesByFieldKey[key];
    if (newValue === undefined || newValue === null) continue;

    setElementValue(el, String(newValue));
    updated += 1;
  }

  return updated;
}

function isPotentiallyFillable(el) {
  if (!(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLInputElement) {
    const blocked = ["hidden", "button", "submit", "reset", "checkbox", "radio", "file"];
    if (blocked.includes((el.type || "").toLowerCase())) return false;
  }

  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  return true;
}

function setElementValue(el, value) {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.focus();
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.blur();
    return;
  }

  if (el instanceof HTMLSelectElement) {
    const option = Array.from(el.options).find((opt) => {
      return opt.value.toLowerCase() === value.toLowerCase() ||
        opt.textContent?.trim().toLowerCase() === value.toLowerCase();
    });

    if (option) {
      el.value = option.value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
}

async function ensureBridgeInjected() {
  if (window.__dataverseBridgeReady) {
    return true;
  }

  const existing = document.querySelector('script[data-dataverse-bridge="1"]');
  if (existing) {
    window.__dataverseBridgeReady = true;
    return true;
  }

  try {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("src/dataverseBridge.js");
    script.dataset.dataverseBridge = "1";
    script.async = false;

    const loaded = new Promise((resolve, reject) => {
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error("Failed to load Dataverse bridge."));
      setTimeout(() => reject(new Error("Dataverse bridge load timeout.")), 2500);
    });

    (document.head || document.documentElement).appendChild(script);
    await loaded;
    window.__dataverseBridgeReady = true;
    return true;
  } catch {
    return false;
  }
}

async function collectDataverseFormViaBridge() {
  const response = await callBridge("COLLECT_FORM", {});
  return response;
}

async function applyViaBridge(values, options) {
  return callBridge("APPLY_VALUES", { values, options });
}

function callBridge(type, payload) {
  return new Promise((resolve, reject) => {
    const requestId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const responseEvent = "DATAVERSE_BRIDGE_RESPONSE";
    const requestEvent = "DATAVERSE_BRIDGE_REQUEST";

    const timeout = setTimeout(() => {
      window.removeEventListener(responseEvent, onResponse);
      reject(new Error("Dataverse bridge request timed out."));
    }, 5000);

    function onResponse(event) {
      const detail = event.detail || {};
      if (detail.requestId !== requestId) {
        return;
      }

      clearTimeout(timeout);
      window.removeEventListener(responseEvent, onResponse);

      if (!detail.ok) {
        reject(new Error(detail.error || "Dataverse bridge request failed."));
        return;
      }
      resolve(detail.data);
    }

    window.addEventListener(responseEvent, onResponse);
    window.dispatchEvent(
      new CustomEvent(requestEvent, {
        detail: {
          requestId,
          type,
          payload
        }
      })
    );
  });
}
