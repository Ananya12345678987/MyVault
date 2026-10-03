/*
 * Helpers for the dynamic key/value fields used by Passwords, API Keys,
 * Environment and Database items (and a person's extra info).
 *
 * An "editor row" is what the form works with:
 *   { id, key, value, protected, info: [{ label, text }], touched }
 * `touched` is client-only. It records that the user has chosen the
 * row's protected state by hand, so renaming the field no longer changes it.
 */

export function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

// Field names that usually hold something secret. Used only to suggest
// "protected" for a NEW field until the user decides for themselves.
const SENSITIVE_NAME =
  /pass(word|wd|phrase|code)?|secret|token|api[-_ ]?key|private|credential|\bpin\b|cvv|otp|2fa|recovery|backup|seed|auth(?!or)|jwt|signing|bearer|session|cookie|security|connection|uri|dsn|salt|key/i;

export function looksSensitive(name) {
  return SENSITIVE_NAME.test(String(name || ""));
}

export function newField(overrides = {}) {
  return { id: makeId(), key: "", value: "", protected: false, info: [], touched: false, ...overrides };
}

/** Server fields (from GET /items/:id) -> editor rows. */
export function toRows(fields = []) {
  return fields.map((f) => ({
    id: f.id,
    key: f.key ?? "",
    value: f.value ?? "",
    protected: Boolean(f.protected),
    info: (f.info || []).map((i) => ({ label: i.label ?? "", text: i.text ?? "" })),
    touched: true,
  }));
}

const cleanInfo = (info = []) =>
  info
    .map((i) => ({ label: (i.label ?? "").trim(), text: i.text ?? "" }))
    .filter((i) => i.label || i.text.trim());

const isBlank = (r) => !r.key.trim() && r.value === "" && cleanInfo(r.info).length === 0;

/** A problem the user should fix before saving, or "" if the rows are fine. */
export function validateRows(rows) {
  for (const r of rows) {
    if (isBlank(r)) continue;
    if (!r.key.trim()) return "Every field needs a name. Give it one, or remove the field.";
  }
  return "";
}

/** Editor rows -> API payload (blank rows and client-only keys dropped). */
export function rowsToPayload(rows) {
  return rows
    .filter((r) => !isBlank(r))
    .map((r) => ({
      id: r.id,
      key: r.key.trim(),
      value: r.value,
      protected: Boolean(r.protected),
      info: cleanInfo(r.info),
    }));
}
