const DEFAULT_CONFIG = {
  azureApiKey: "",
  azureEndpoint: "",
  azureModel: "gpt-5.1",
  fillLockedFields: false
};
const AZURE_RESPONSES_API_VERSION = "2025-04-01-preview";

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(Object.keys(DEFAULT_CONFIG));
  const merged = { ...DEFAULT_CONFIG, ...current };
  await chrome.storage.sync.set(merged);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "GENERATE_FIELD_VALUES") {
    return false;
  }

  generateFieldValues(message.payload)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

async function generateFieldValues(payload) {
  const config = await chrome.storage.sync.get([
    ...Object.keys(DEFAULT_CONFIG),
    "azureDeployment"
  ]);
  if (!config.azureModel && config.azureDeployment) {
    config.azureModel = config.azureDeployment;
  }
  const prompt = buildPrompt(payload);

  return callAzure(config, prompt);
}

function buildPrompt(payload) {
  const fieldsText = payload.fields
    .map((f, i) => `${i + 1}. id=${f.id || ""}, name=${f.name || ""}, label=${f.label || ""}, type=${f.type || "text"}`)
    .join("\n");
  const entityName = payload?.dataverse?.entityName || "";
  const tabs = Array.isArray(payload?.dataverse?.tabs) ? payload.dataverse.tabs : [];
  const tabNames = tabs
    .map((tab) => tab.label || tab.name)
    .filter(Boolean)
    .join(", ");

  return [
    "You generate realistic sample form values for a Microsoft Dataverse form.",
    "Return strict JSON only.",
    "Do not include markdown, code fences, comments, or explanatory text.",
    "Format: {\"values\": {\"<fieldKey>\": \"<value>\"}}.",
    "Use field key priority: id if present, otherwise name.",
    `Entity logical name: ${entityName || "unknown"}`,
    `Form tabs: ${tabNames || "unknown"}`,
    `Business context: ${payload.context || "General CRM data entry"}`,
    "Fields:",
    fieldsText
  ].join("\n");
}

async function callAzure(config, prompt) {
  if (!config.azureApiKey || !config.azureEndpoint || !config.azureModel) {
    throw new Error("Azure settings are incomplete. Set endpoint, model, and key in options.");
  }

  const urls = buildAzureUrls(config.azureEndpoint);
  const authHeaders = [
    { Authorization: `Bearer ${config.azureApiKey}` },
    { "api-key": config.azureApiKey }
  ];

  let lastError = "Unknown Azure error.";
  for (const url of urls) {
    for (const auth of authHeaders) {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...auth
        },
        body: JSON.stringify({
          model: config.azureModel,
          input: [
            {
              role: "system",
              content: [
                {
                  type: "input_text",
                  text: "You are a precise JSON generator."
                }
              ]
            },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: prompt
                }
              ]
            }
          ],
          max_output_tokens: 2048
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = extractAssistantText(data);
        return parseAiJson(content);
      }

      const text = await response.text();
      lastError = `${response.status} ${text}`;
    }
  }

  throw new Error(
    `Azure request failed: ${lastError}. Verify endpoint (base resource URL), model, and API key.`
  );
}

function buildAzureUrls(endpointInput) {
  const raw = String(endpointInput || "").trim().replace(/\s+/g, "");
  if (!raw) return [];

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Azure endpoint is not a valid URL.");
  }

  const hostBase = `${parsed.protocol}//${parsed.host}`;
  let path = parsed.pathname.replace(/\/+$/, "");
  path = path.replace(/\/openai\/responses$/i, "");
  path = path.replace(/\/openai\/v1\/responses$/i, "");
  const base = `${hostBase}${path}`;

  return [
    `${base}/openai/responses?api-version=${encodeURIComponent(AZURE_RESPONSES_API_VERSION)}`,
    `${base}/openai/v1/responses`
  ];
}

function extractAssistantText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  if (Array.isArray(data?.choices)) {
    const chatContent = data.choices[0]?.message?.content;
    if (typeof chatContent === "string" && chatContent.trim()) {
      return chatContent;
    }
    if (Array.isArray(chatContent)) {
      const textParts = chatContent
        .map((part) => (typeof part?.text === "string" ? part.text : ""))
        .filter(Boolean);
      if (textParts.length > 0) {
        return textParts.join("\n");
      }
    }
  }

  if (Array.isArray(data?.output)) {
    for (const item of data.output) {
      if (!Array.isArray(item?.content)) continue;
      const textParts = item.content
        .map((part) => {
          if (typeof part?.text === "string") return part.text;
          if (typeof part?.output_text === "string") return part.output_text;
          return "";
        })
        .filter(Boolean);
      if (textParts.length > 0) {
        return textParts.join("\n");
      }
    }
  }

  throw new Error("AI response did not include assistant text.");
}

function parseAiJson(content) {
  const parsed = parseJsonWithFallback(content);

  if (!parsed?.values || typeof parsed.values !== "object") {
    throw new Error("AI JSON must contain a 'values' object.");
  }

  return parsed.values;
}

function parseJsonWithFallback(content) {
  const trimmed = String(content || "").trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    return JSON.parse(withoutFence);
  } catch {
    const candidate = extractFirstJsonObject(withoutFence);
    if (!candidate) {
      throw new Error("AI response was not valid JSON.");
    }
    try {
      return JSON.parse(candidate);
    } catch {
      throw new Error("AI response was not valid JSON.");
    }
  }
}

function extractFirstJsonObject(text) {
  const start = text.indexOf("{");
  if (start < 0) return "";

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === "{") depth += 1;
    if (ch === "}") depth -= 1;

    if (depth === 0) {
      return text.slice(start, i + 1);
    }
  }
  return "";
}
