const crypto = require("crypto");
 
/**
 * Dynamic key/value fields for Password, API Key (secret), Environment (env),
 * Database (dbCredential) items, and the free-form extras on a Person.
 *
 * Storage model (nothing here weakens the existing encryption):
 *  - `item.fields` always holds { id, key, protected } for every field.
 *    Key NAMES are plaintext metadata so a locked card can still say
 *    "Email / Username / Password".
 *  - If the item is `sensitive`, every field's value and info live ONLY
 *    inside the existing AES-256-GCM blob (protectedContentEncrypted)
 *    under `fieldValues[id]`. Nothing new is stored in plaintext.
 *  - If the item is not sensitive, value/info are stored inline in
 *    `item.fields` (same as every other non-sensitive column today).
 *  - `field.protected` only controls masking (eye/copy) and whether the
 *    value may appear in the bulk list response. It never leaves the
 *    detail endpoint.
 */
 
const KEY_VALUE_TYPES = ["password", "secret", "env", "dbCredential"];
const USES_FIELDS_TYPES = [...KEY_VALUE_TYPES, "person"];
const MAX_FIELDS = 100;
 
function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}
 
function cleanInfo(info) {
  if (!Array.isArray(info)) return [];
  return info
    .slice(0, 20)
    .map((i) => ({
      label: String(i?.label ?? "").trim().slice(0, 200),
      text: String(i?.text ?? "").slice(0, 2000),
    }))
    .filter((i) => i.label || i.text);
}
 
/** Validate + normalise the `fields` array coming from the client. */
function normalizeFields(input) {
  if (!Array.isArray(input)) return [];
  if (input.length > MAX_FIELDS) {
    throw badRequest(`An item can have at most ${MAX_FIELDS} fields.`);
  }
 
  const seen = new Set();
  return input.map((f) => {
    const key = String(f?.key ?? "").trim().slice(0, 200);
    if (!key) throw badRequest("Every field needs a name.");
 
    let id = typeof f.id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(f.id) ? f.id : null;
    if (!id || seen.has(id)) id = crypto.randomUUID();
    seen.add(id);
 
    return {
      id,
      key,
      protected: Boolean(f.protected),
      value: f.value == null ? "" : String(f.value),
      info: cleanInfo(f.info),
    };
  });
}
 
/**
 * Split normalised fields into what is stored as plaintext on the item
 * and what goes into the encrypted blob.
 */
function splitFields(fields, sensitive) {
  const publicFields = [];
  const protectedValues = {};
 
  for (const f of fields) {
    if (sensitive) {
      publicFields.push({ id: f.id, key: f.key, protected: f.protected });
      protectedValues[f.id] = { value: f.value, info: f.info };
    } else {
      publicFields.push({
        id: f.id,
        key: f.key,
        protected: f.protected,
        value: f.value,
        info: f.info,
      });
    }
  }
 
  return { publicFields, protectedValues: sensitive ? protectedValues : undefined };
}
 
/** Rebuild full fields (with values) from stored fields + decrypted values. */
function mergeFields(storedFields, fieldValues) {
  const values = fieldValues || {};
  return (storedFields || []).map((f) => {
    const o = typeof f.toObject === "function" ? f.toObject() : f;
    const enc = values[o.id];
    return {
      id: o.id,
      key: o.key,
      protected: Boolean(o.protected),
      value: enc ? enc.value ?? "" : o.value ?? null,
      info: enc ? enc.info || [] : o.info || [],
    };
  });
}
 
// ---------------------------------------------------------------------------
// Legacy items (created before `fields` existed, fieldsVersion < 2)
// ---------------------------------------------------------------------------
 
function parseEnv(text) {
  const out = [];
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out.push({ key: m[1], value: v });
  }
  return out;
}
 
/** Fields synthesised for the LIST view of a legacy item (no decryption). */
function legacyListFields(o, locked) {
  const f = (id, key, isProtected, value) => ({
    id: `legacy-${id}`,
    key,
    protected: isProtected,
    locked: isProtected && locked,
    ...(value !== undefined ? { value } : {}),
  });
 
  switch (o.type) {
    case "password": {
      const out = [];
      if (o.username) out.push(f("username", "Username", false, o.username));
      out.push(f("password", "Password", true));
      return out;
    }
    case "secret":
      return [f("secret", "Secret", true)];
    case "env":
      return [f("env", "Environment", true)];
    case "dbCredential": {
      const out = [];
      if (o.dbName) out.push(f("dbname", "Database name", false, o.dbName));
      if (o.dbHost) out.push(f("dbhost", "Host", false, o.dbHost));
      out.push(f("uri", "Connection URI", true));
      return out;
    }
    default:
      return [];
  }
}
 
/** Fields synthesised for the DETAIL view of a legacy item (values known). */
function legacyDetailFields(type, r) {
  const f = (id, key, isProtected, value) => ({
    id: `legacy-${id}`,
    key,
    protected: isProtected,
    value: value ?? "",
    info: [],
  });
 
  switch (type) {
    case "password": {
      const out = [];
      if (r.username) out.push(f("username", "Username", false, r.username));
      out.push(f("password", "Password", true, r.value));
      return out;
    }
    case "secret":
      return [f("secret", "Secret", true, r.value)];
    case "env": {
      const parsed = parseEnv(r.value);
      if (parsed.length) {
        return parsed.map((p, i) => f(`env-${i}`, p.key, true, p.value));
      }
      return r.value ? [f("env", "Environment", true, r.value)] : [];
    }
    case "dbCredential": {
      const out = [];
      if (r.dbName) out.push(f("dbname", "Database name", false, r.dbName));
      if (r.dbHost) out.push(f("dbhost", "Host", false, r.dbHost));
      out.push(f("uri", "Connection URI", true, r.value));
      return out;
    }
    default:
      return [];
  }
}
 
/**
 * Fields for the bulk list response. NEVER includes a protected value,
 * and only includes an unprotected value when it is actually readable
 * (plaintext item, or sensitive item with the vault unlocked).
 *
 * `plainObject`   – item.toObject()
 * `decryptedVals` – fieldValues from the decrypted blob, or null if the
 *                   item is sensitive and the vault is locked.
 */
function listFields(plainObject, decryptedVals) {
  const o = plainObject;
  const sensitive = Boolean(o.sensitive);
  const locked = sensitive && !decryptedVals;
 
  if (KEY_VALUE_TYPES.includes(o.type) && !(o.fieldsVersion >= 2)) {
    return legacyListFields(o, locked);
  }
 
  return (o.fields || []).map((f) => {
    const out = { id: f.id, key: f.key, protected: Boolean(f.protected), locked };
    if (!f.protected) {
      if (!sensitive && f.value !== undefined) out.value = f.value;
      if (sensitive && decryptedVals && decryptedVals[f.id]) {
        out.value = decryptedVals[f.id].value ?? "";
      }
    }
    return out;
  });
}
 
module.exports = {
  KEY_VALUE_TYPES,
  USES_FIELDS_TYPES,
  normalizeFields,
  splitFields,
  mergeFields,
  listFields,
  legacyDetailFields,
  parseEnv,
};
 