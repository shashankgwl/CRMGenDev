(function () {
  if (window.__dataverseBridgeInstalled) {
    return;
  }
  window.__dataverseBridgeInstalled = true;

  const REQUEST_EVENT = "DATAVERSE_BRIDGE_REQUEST";
  const RESPONSE_EVENT = "DATAVERSE_BRIDGE_RESPONSE";

  window.addEventListener(REQUEST_EVENT, (event) => {
    const detail = event.detail || {};
    const requestId = detail.requestId;
    const type = detail.type;
    const payload = detail.payload || {};

    try {
      let data;
      if (type === "COLLECT_FORM") {
        data = collectForm();
      } else if (type === "APPLY_VALUES") {
        data = applyValues(payload.values || {}, payload.options || {});
      } else {
        throw new Error("Unsupported bridge request type.");
      }

      dispatchResponse(requestId, true, data);
    } catch (error) {
      dispatchResponse(requestId, false, null, error && error.message ? error.message : String(error));
    }
  });

  function dispatchResponse(requestId, ok, data, error) {
    window.dispatchEvent(
      new CustomEvent(RESPONSE_EVENT, {
        detail: { requestId, ok, data, error: error || null }
      })
    );
  }

  function collectForm() {
    const ctx = getFormContext();
    if (!ctx) {
      throw new Error("Xrm form context was not found on this page.");
    }

    const fields = [];
    const tabs = [];
    const fieldMap = new Map();

    const controls = safeCollection(ctx.ui && ctx.ui.controls);
    for (const control of controls) {
      if (!control || typeof control.getName !== "function") continue;
      const controlName = safeCall(control, "getName") || "";
      const controlType = safeCall(control, "getControlType") || "";
      const label = safeCall(control, "getLabel") || "";
      const visible = safeBool(control, "getVisible", true);
      const disabled = safeBool(control, "getDisabled", false);

      let attribute = null;
      if (typeof control.getAttribute === "function") {
        attribute = control.getAttribute();
      }

      const logicalName = attribute && typeof attribute.getName === "function"
        ? attribute.getName()
        : controlName;
      if (!logicalName) continue;

      const entry = fieldMap.get(logicalName) || {
        key: logicalName,
        logicalName,
        label: "",
        type: "",
        requiredLevel: "none",
        isDirty: false,
        controls: []
      };

      if (!entry.label) entry.label = label || logicalName;
      if (attribute && !entry.type && typeof attribute.getAttributeType === "function") {
        entry.type = attribute.getAttributeType() || "unknown";
      }
      if (attribute && typeof attribute.getRequiredLevel === "function") {
        entry.requiredLevel = attribute.getRequiredLevel() || "none";
      }
      if (attribute && typeof attribute.getIsDirty === "function") {
        entry.isDirty = Boolean(attribute.getIsDirty());
      }

      entry.controls.push({
        name: controlName,
        type: controlType,
        label,
        visible,
        disabled
      });
      fieldMap.set(logicalName, entry);
    }

    for (const field of fieldMap.values()) {
      fields.push(field);
    }

    const tabItems = safeCollection(ctx.ui && ctx.ui.tabs);
    for (const tab of tabItems) {
      const tabData = {
        name: safeCall(tab, "getName") || "",
        label: safeCall(tab, "getLabel") || "",
        visible: safeBool(tab, "getVisible", true),
        state: safeCall(tab, "getDisplayState") || "",
        sections: []
      };

      const sections = safeCollection(tab && tab.sections);
      for (const section of sections) {
        tabData.sections.push({
          name: safeCall(section, "getName") || "",
          label: safeCall(section, "getLabel") || "",
          visible: safeBool(section, "getVisible", true)
        });
      }
      tabs.push(tabData);
    }

    const entityName = safeCall(ctx.data && ctx.data.entity, "getEntityName") || "";
    const entityId = safeCall(ctx.data && ctx.data.entity, "getId") || "";

    return {
      entityName,
      entityId,
      fields,
      tabs
    };
  }

  function applyValues(valuesByKey, options) {
    const ctx = getFormContext();
    if (!ctx) {
      throw new Error("Xrm form context was not found on this page.");
    }
    const includeLockedFields = Boolean(options && options.fillLockedFields);
    const processedKeys = new Set();

    const updates = [];
    const skipped = [];

    for (const [key, value] of Object.entries(valuesByKey)) {
      processedKeys.add(key);
      const attr = ctx.getAttribute && ctx.getAttribute(key);
      if (!attr) {
        skipped.push({ key, reason: "attribute_not_found" });
        continue;
      }
      if (isFieldLevelSecurityBlocked(attr)) {
        skipped.push({ key, reason: "field_level_security" });
        continue;
      }
      if (!includeLockedFields && isAttributeLocked(attr)) {
        skipped.push({ key, reason: "locked_field" });
        continue;
      }

      const type = typeof attr.getAttributeType === "function" ? attr.getAttributeType() : "unknown";
      const parsed = parseForAttributeType(type, value, attr);
      if (!parsed.supported) {
        skipped.push({ key, reason: parsed.reason || "unsupported_type", type });
        continue;
      }

      try {
        attr.setValue(parsed.value);
        if (typeof attr.fireOnChange === "function") {
          attr.fireOnChange();
        }
        updates.push({ key, type });
      } catch (error) {
        skipped.push({ key, reason: "set_failed", details: error && error.message ? error.message : String(error) });
      }
    }

    fillRandomEmptyOptionSets(ctx, processedKeys, includeLockedFields, updates, skipped);

    return {
      updated: updates.length,
      updates,
      skipped
    };
  }

  function fillRandomEmptyOptionSets(ctx, processedKeys, includeLockedFields, updates, skipped) {
    if (typeof ctx.getAttribute !== "function") return;
    const attrs = ctx.getAttribute() || [];

    for (const attr of attrs) {
      if (!attr || typeof attr.getName !== "function") continue;
      const key = attr.getName();
      if (!key || processedKeys.has(key)) continue;

      const type = typeof attr.getAttributeType === "function" ? attr.getAttributeType() : "";
      if (!["optionset", "picklist", "multioptionset"].includes(type)) continue;

      const currentValue = typeof attr.getValue === "function" ? attr.getValue() : null;
      if (currentValue !== null && currentValue !== undefined && currentValue !== "") continue;

      if (isFieldLevelSecurityBlocked(attr)) {
        skipped.push({ key, reason: "field_level_security" });
        continue;
      }
      if (!includeLockedFields && isAttributeLocked(attr)) {
        skipped.push({ key, reason: "locked_field" });
        continue;
      }

      const randomValue = getRandomOptionValue(attr, type);
      if (randomValue === null) {
        skipped.push({ key, reason: "option_not_found", type });
        continue;
      }

      try {
        attr.setValue(randomValue);
        if (typeof attr.fireOnChange === "function") {
          attr.fireOnChange();
        }
        updates.push({ key, type, source: "random_optionset" });
      } catch (error) {
        skipped.push({ key, reason: "set_failed", details: error && error.message ? error.message : String(error) });
      }
    }
  }

  function getRandomOptionValue(attr, type) {
    const options = typeof attr.getOptions === "function" ? attr.getOptions() : [];
    const valid = options
      .map((opt) => opt && opt.value)
      .filter((value) => typeof value === "number" && !Number.isNaN(value));

    if (!valid.length) return null;

    const picked = valid[Math.floor(Math.random() * valid.length)];
    if (type === "multioptionset") {
      return [picked];
    }
    return picked;
  }

  function isAttributeLocked(attr) {
    const controlsApi = attr && attr.controls;
    if (!controlsApi || typeof controlsApi.get !== "function") {
      return false;
    }

    const controls = controlsApi.get() || [];
    if (!controls.length) {
      return false;
    }

    for (const control of controls) {
      if (!control || typeof control.getDisabled !== "function") {
        return false;
      }
      if (!control.getDisabled()) {
        return false;
      }
    }

    return true;
  }

  function isFieldLevelSecurityBlocked(attr) {
    if (!attr || typeof attr.getUserPrivilege !== "function") {
      return false;
    }

    try {
      const privilege = attr.getUserPrivilege();
      if (!privilege || typeof privilege !== "object") {
        return false;
      }
      return privilege.canUpdate === false;
    } catch {
      return false;
    }
  }

  function parseForAttributeType(type, value, attr) {
    if (value === undefined || value === null) {
      return { supported: false, reason: "empty_value" };
    }

    if (["string", "memo"].includes(type)) {
      return { supported: true, value: String(value) };
    }

    if (["integer", "decimal", "double", "money"].includes(type)) {
      const num = Number(value);
      if (Number.isNaN(num)) return { supported: false, reason: "invalid_number" };
      return { supported: true, value: num };
    }

    if (type === "boolean") {
      if (typeof value === "boolean") return { supported: true, value };
      const normalized = String(value).trim().toLowerCase();
      if (["true", "yes", "1"].includes(normalized)) return { supported: true, value: true };
      if (["false", "no", "0"].includes(normalized)) return { supported: true, value: false };
      return { supported: false, reason: "invalid_boolean" };
    }

    if (["datetime", "date"].includes(type)) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return { supported: false, reason: "invalid_date" };
      return { supported: true, value: date };
    }

    if (["optionset", "picklist", "status", "state"].includes(type)) {
      if (typeof value === "number") return { supported: true, value };
      const num = Number(value);
      if (!Number.isNaN(num)) return { supported: true, value: num };

      const options = typeof attr.getOptions === "function" ? attr.getOptions() : [];
      const matched = options.find((opt) =>
        String(opt.text || "").trim().toLowerCase() === String(value).trim().toLowerCase()
      );
      if (!matched) return { supported: false, reason: "option_not_found" };
      return { supported: true, value: matched.value };
    }

    if (type === "multioptionset") {
      if (Array.isArray(value)) {
        const arr = value.map((x) => Number(x)).filter((x) => !Number.isNaN(x));
        return arr.length ? { supported: true, value: arr } : { supported: false, reason: "invalid_multioptionset" };
      }
      const parts = String(value).split(",").map((x) => Number(x.trim())).filter((x) => !Number.isNaN(x));
      return parts.length ? { supported: true, value: parts } : { supported: false, reason: "invalid_multioptionset" };
    }

    if (["lookup", "customer", "owner", "partylist"].includes(type)) {
      if (Array.isArray(value)) {
        return { supported: true, value };
      }
      return { supported: false, reason: "lookup_requires_object_array" };
    }

    return { supported: false, reason: "unsupported_type" };
  }

  function getFormContext() {
    const xrm = window.Xrm;
    if (!xrm) return null;
    if (xrm.Page) return xrm.Page;
    return null;
  }

  function safeCollection(collectionApi) {
    if (!collectionApi || typeof collectionApi.get !== "function") return [];
    try {
      return collectionApi.get() || [];
    } catch {
      return [];
    }
  }

  function safeCall(obj, methodName) {
    if (!obj || typeof obj[methodName] !== "function") return null;
    try {
      return obj[methodName]();
    } catch {
      return null;
    }
  }

  function safeBool(obj, methodName, defaultValue) {
    const value = safeCall(obj, methodName);
    if (typeof value === "boolean") return value;
    return defaultValue;
  }
})();
