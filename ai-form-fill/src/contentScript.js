chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "RUN_AUTOFILL") {
    return false;
  }

  runAutofill(message.context, {
    fillLockedFields: Boolean(message.fillLockedFields),
    fillLookupFields: Boolean(message.fillLookupFields)
  })
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

async function runAutofill(context, options) {
  const bridgeReady = await ensureBridgeInjected();
  if (!bridgeReady) {
    throw new Error("Dataverse Xrm context unavailable. Autofill stopped to avoid updating secure fields unsafely. Refresh page and try again.");
  }

  const formInfo = await collectDataverseFormViaBridge();
  const fields = normalizeFieldsForAi(formInfo?.fields || []);

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

  const applyResult = await applyViaBridge(response.data, options);
  const updates = applyResult?.updated || 0;
  const skipped = applyResult?.skipped || [];
  if (Array.isArray(applyResult?.debug)) {
    for (const line of applyResult.debug.slice(-80)) {
      try {
        console.warn(line);
      } catch {
        // no-op
      }
    }
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
    const timeoutMs = type === "APPLY_VALUES" ? 45000 : 10000;

    const timeout = setTimeout(() => {
      window.removeEventListener(responseEvent, onResponse);
      reject(new Error(`Dataverse bridge request timed out (${type} after ${timeoutMs}ms).`));
    }, timeoutMs);

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
