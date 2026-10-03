const VaultItem = require("../models/VaultItem");
const { encryptField, decryptField } = require("../security/crypto");
const {
  USES_FIELDS_TYPES,
  KEY_VALUE_TYPES,
  normalizeFields,
  splitFields,
  mergeFields,
  listFields,
  legacyDetailFields,
} = require("./vaultFields");


// EVERY type now goes through the same "user decides" path — there is
// no more fixed always-encrypted category. This list is exhaustive:
// anything not in here is not a recognized item type.
const FLEXIBLE_TYPES = [
  "password", "secret", "env", "dbCredential",
  "note", "resource", "snippet", "person",
];

// Which field(s) hold each type's content, and get bundled into one
// encrypted JSON blob when that item's `sensitive` is true.
const FLEXIBLE_TYPE_FIELDS = {
  password: ["password"], // username stays separate, always plaintext metadata
  secret: ["secret"],
  env: ["envContent"],
  dbCredential: ["dbConnectionUri"], // dbName/dbHost stay separate plaintext metadata
  note: ["noteContent"],
  resource: ["url", "whySaved", "whatToRemember"],
  snippet: ["language", "code"],
  person: ["name", "email", "phone", "company", "role"],
};

// Every item can carry free-form `notes`. They are now encrypted together
// with the rest of a protected item's content instead of sitting in
// plaintext next to it. Key/value items and persons also carry their
// per-field values in `fieldValues`.
for (const t of FLEXIBLE_TYPES) FLEXIBLE_TYPE_FIELDS[t].push("notes");
for (const t of USES_FIELDS_TYPES) FLEXIBLE_TYPE_FIELDS[t].push("fieldValues");

// The old single-value columns that `fields` replaces.
const LEGACY_CONTENT_KEYS = {
  password: ["password"],
  secret: ["secret"],
  env: ["envContent"],
  dbCredential: ["dbConnectionUri"],
};

// There is exactly one "Myself" profile per user.
async function assertNoMyselfProfile(userId, exceptId) {
  const filter = { userId, type: "person", personGroup: "myself", isDeleted: false };
  if (exceptId) filter._id = { $ne: exceptId };
  if (await VaultItem.exists(filter)) {
    const err = new Error('You already have a "Myself" profile - edit that one instead.');
    err.status = 409;
    throw err;
  }
}

// For types with exactly one protectable field, this is the name the
// frontend expects it under (`detail.value`) after decrypting.
const SINGLE_VALUE_FIELD = {
  password: "password",
  secret: "secret",
  env: "envContent",
  dbCredential: "dbConnectionUri",
  note: "noteContent",
};

// The unlock requirement is now purely per-item, for every type.
function itemRequiresUnlock(type, sensitiveFlag) {
  return FLEXIBLE_TYPES.includes(type) && Boolean(sensitiveFlag);
}

/**
 * Create a vault item. Sensitive values are encrypted before storage.
 */
async function createVaultItem({
    userId, vaultKey, type, title,
  username, website, password, secret, envContent, dbConnectionUri, dbName, dbHost,
  sensitive, noteContent, url, whySaved, whatToRemember, language, code,
  name, email, phone, company, role, tags, notes, data = {},
  kvFields, personGroup,
}) {
  if (!FLEXIBLE_TYPES.includes(type)) {
    const err = new Error(`Unsupported item type: ${type}`);
    err.status = 400;
    throw err;
  }

// Key/value items (and a person's extra info) arrive as `kvFields`.
  // Names are stored in plaintext; values go to the encrypted blob when
  // the item is sensitive (see services/vaultFields.js).
  const usesFields = USES_FIELDS_TYPES.includes(type) && kvFields !== undefined;
  let publicFields;
  let fieldValues;
  if (usesFields) {
    const split = splitFields(normalizeFields(kvFields), Boolean(sensitive));
    publicFields = split.publicFields;
    fieldValues = split.protectedValues;
  }

  const fields = { password, secret, envContent, dbConnectionUri, noteContent, url, whySaved, whatToRemember, language, code, name, email, phone, company, role, notes, fieldValues };

const doc = { userId, type, title, tags, data, sensitive };

  if (usesFields) {
    doc.fields = publicFields;
    doc.fieldsVersion = 2;
  }
  if (type === "person") {
    doc.personGroup = personGroup || "other";
    if (doc.personGroup === "myself") await assertNoMyselfProfile(userId);
  }

  // Always-plaintext metadata, unaffected by the sensitive choice.
    if (type === "password") {
    doc.username = username;
    doc.website = website;
  }
  if (type === "dbCredential") {
    doc.dbName = dbName;
    doc.dbHost = dbHost;
  }

  if (sensitive) {
    const payload = {};
    for (const key of FLEXIBLE_TYPE_FIELDS[type]) {
      if (fields[key] !== undefined) payload[key] = fields[key];
    }
    doc.protectedContentEncrypted = encryptField(JSON.stringify(payload), vaultKey);
  } else {
    for (const key of FLEXIBLE_TYPE_FIELDS[type]) {
      if (fields[key] !== undefined) doc[key] = fields[key];
    }
  }

  const item = new VaultItem(doc);
  return item.save();
}

/**
 * Which items a sidebar view shows. (The category filter stays client-side.)
 */
function listFilter(userId, view) {
  switch (view) {
    case "trash":
      return { userId, isDeleted: true };
    case "archived":
      return { userId, isDeleted: false, isArchived: true };
    case "starred":
      return { userId, isDeleted: false, isArchived: { $ne: true }, isStarred: true };
    default:
      return { userId, isDeleted: false, isArchived: { $ne: true } };
  }
}

/**
 * Shape one row for the list response. Protected field values are never
 * included. If the vault is unlocked, the UNPROTECTED values of encrypted
 * items (Email, Username, PORT...) are decrypted so the cards can show
 * them; the blob itself is never sent to the client.
 */
// Plain-text preview of a rich-text note (React escapes it when shown).
function plainPreview(html, max = 140) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function toListItem(doc, vaultKey) {
const o = doc.toObject();
let decryptedVals = null;
  let payload = null; // the decrypted blob, only while the vault is unlocked

if (o.sensitive && vaultKey && o.protectedContentEncrypted) {
  try {
payload = JSON.parse(decryptField(o.protectedContentEncrypted, vaultKey));
      decryptedVals = payload.fieldValues || {};
  } catch {
decryptedVals = null; // stale/wrong key: stay locked, never fail the whole list
      payload = null;
  }
  }

  if (USES_FIELDS_TYPES.includes(o.type)) o.fields = listFields(o, decryptedVals);
o.locked = Boolean(o.sensitive) && !payload;

  // Short, safe previews for the cards. Only built from content we are
  // allowed to read: a plaintext item, or an encrypted one with the vault
  // unlocked. Full content is only ever sent by the detail endpoint.
  o.preview = null;
  if (!o.sensitive || payload) {
    const src = o.sensitive ? payload : o;
    switch (o.type) {
      case "note":
        o.preview = { text: plainPreview(src.noteContent) };
        break;
      case "snippet":
        o.preview = {
          language: src.language || null,
          code: String(src.code || "").split("\n").slice(0, 3).join("\n").slice(0, 240),
          description: src.notes || null,
        };
        break;
      case "resource":
        o.preview = { url: src.url || null, whySaved: src.whySaved || null };
        break;
      case "person":
        o.preview = { phone: src.phone || null, email: src.email || null };
        break;
      default:
        break;
    }
  }
delete o.protectedContentEncrypted;
  delete o.noteContent;
  delete o.code;
  return o;
}

/**
 * List items without revealing sensitive values
*/
async function listVaultItems(userId, view = "all", vaultKey = null) {
return VaultItem.find(listFilter(userId, view))
  .select(
      "type title sensitive dbName dbHost url whySaved whatToRemember language code name email phone company role tags notes data createdAt updatedAt " +
      "username website fields fieldsVersion personGroup isStarred isArchived deletedAt +protectedContentEncrypted +noteContent"
    )
.sort({ updatedAt: -1 })
    .then((docs) => docs.map((d) => toListItem(d, vaultKey)));
  }

/**
 * Get one vault item.
 *
 * THE UNLOCK CHECK LIVES HERE — right after loading the item, because
 * only now do we know its real type and its real `sensitive` flag.
 * The controller passes whatever key it has (possibly null); this
 * function throws a 423 if that key turns out to actually be needed.
 */
async function getVaultItem(userId, itemId, vaultKey) {
  const item = await VaultItem.findOne({ _id: itemId, userId, isDeleted: false }).select(
    "+usernameEncrypted +passwordEncrypted +secretEncrypted +envContentEncrypted " +
      "+dbConnectionUriEncrypted +noteContent +protectedContentEncrypted"
  );

  if (!item) return null;

  if (itemRequiresUnlock(item.type, item.sensitive) && !vaultKey) {
    const err = new Error("This item is protected — unlock your vault to view it.");
    err.status = 423;
    throw err;
  }

      const result = {
    id: item._id,
    type: item.type,
    title: item.title,
    sensitive: item.sensitive,
    notes: item.notes || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    username: item.username || null,
    website: item.website || null,
    value: null,
    dbName: item.dbName || null,
    dbHost: item.dbHost || null,
    tags: item.tags || [],
    data: item.data,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    url: null, whySaved: null, whatToRemember: null,
    language: null, code: null,
    name: null, email: null, phone: null, company: null, role: null,
  };

  if (item.sensitive) {
    if (item.protectedContentEncrypted) {
      const payload = JSON.parse(decryptField(item.protectedContentEncrypted, vaultKey));
      Object.assign(result, payload);
      const singleField = SINGLE_VALUE_FIELD[item.type];
      if (singleField) result.value = payload[singleField] ?? null;
    }
  } else {
    for (const key of FLEXIBLE_TYPE_FIELDS[item.type]) {
      result[key] = item[key] ?? null;
    }
    const singleField = SINGLE_VALUE_FIELD[item.type];
    if (singleField) result.value = item[singleField] ?? null;
  }

result.isStarred = Boolean(item.isStarred);
  result.isArchived = Boolean(item.isArchived);
  result.deletedAt = item.deletedAt || null;
  result.personGroup = item.personGroup || null;

  if (USES_FIELDS_TYPES.includes(item.type)) {
    const isLegacy = KEY_VALUE_TYPES.includes(item.type) && !(item.fieldsVersion >= 2);
    result.fields = isLegacy
      ? legacyDetailFields(item.type, result)
      : mergeFields(item.fields, result.fieldValues);
  }
  delete result.fieldValues;

  return result;
}

/**
 * Update a vault item.
 *
 * SAME PRINCIPLE: the guard lives HERE, right after loading the item.
 * Needs a key if the item IS currently sensitive (to decrypt/re-save)
 * OR if this request is turning it sensitive (to encrypt it).
 */
  async function updateVaultItem({
  userId, itemId, vaultKey, title,website,
  username, password, secret, envContent, dbConnectionUri, dbName, dbHost,
  sensitive, noteContent, url, whySaved, whatToRemember, language, code,
  name, email, phone, company, role, tags, notes, data,kvFields, personGroup,
}) {
  const item = await VaultItem.findOne({ _id: itemId, userId, isDeleted: false }).select(
    "+usernameEncrypted +passwordEncrypted +secretEncrypted +envContentEncrypted " +
      "+dbConnectionUriEncrypted +noteContent +protectedContentEncrypted"
  );
  if (!item) return null;

  const willBeSensitive = sensitive !== undefined ? sensitive : item.sensitive;
  if (itemRequiresUnlock(item.type, item.sensitive || willBeSensitive) && !vaultKey) {
    const err = new Error("This item is protected — unlock your vault to edit it.");
    err.status = 423;
    throw err;
  }

  if (title !== undefined) item.title = title;
  if (tags !== undefined) item.tags = tags;
  if (personGroup !== undefined && item.type === "person" && personGroup !== item.personGroup) {
    if (personGroup === "myself") await assertNoMyselfProfile(item.userId, item._id);
    item.personGroup = personGroup;
  }
  if (data !== undefined) item.data = data;
  if (dbName !== undefined) item.dbName = dbName;
  if (dbHost !== undefined) item.dbHost = dbHost;
  if (username !== undefined) item.username = username;
  if (website !== undefined) item.website = website;

  const wasSensitive = item.sensitive;
  const newFieldValues = { password, secret, envContent, dbConnectionUri, noteContent, url, whySaved, whatToRemember, language, code, name, email, phone, company, role, notes };

  let currentPayload = {};
  if (wasSensitive && item.protectedContentEncrypted) {
    currentPayload = JSON.parse(decryptField(item.protectedContentEncrypted, vaultKey));
  } else if (!wasSensitive) {
    for (const k of FLEXIBLE_TYPE_FIELDS[item.type]) {
      if (item[k] !== undefined) currentPayload[k] = item[k];
    }
  }
  for (const k of FLEXIBLE_TYPE_FIELDS[item.type]) {
    if (newFieldValues[k] !== undefined) currentPayload[k] = newFieldValues[k];
  }

// A legacy plaintext `notes` value is carried into the payload (and so
  // gets encrypted on protected items) instead of being dropped.
  if (currentPayload.notes === undefined && item.notes !== undefined) {
    currentPayload.notes = item.notes;
  }

  // Dynamic key/value fields: re-split when the client sends them, or when
  // the item flips between protected and not (values must move between
  // the plaintext fields and the encrypted blob).
  if (USES_FIELDS_TYPES.includes(item.type)) {
    const converting = wasSensitive !== willBeSensitive && item.fieldsVersion >= 2;
    if (kvFields !== undefined || converting) {
      const nextFields =
        kvFields !== undefined
          ? normalizeFields(kvFields)
          : mergeFields(item.fields, currentPayload.fieldValues);
      const split = splitFields(nextFields, willBeSensitive);

      if (!(item.fieldsVersion >= 2) && KEY_VALUE_TYPES.includes(item.type)) {
        // First save through the new editor: retire the legacy columns.
        for (const k of LEGACY_CONTENT_KEYS[item.type]) delete currentPayload[k];
        item.username = undefined;
        item.dbName = undefined;
        item.dbHost = undefined;
      }

      item.fields = split.publicFields;
      item.fieldsVersion = 2;
      if (split.protectedValues) currentPayload.fieldValues = split.protectedValues;
      else delete currentPayload.fieldValues;
    }
  }

  if (willBeSensitive) {
  item.protectedContentEncrypted = encryptField(JSON.stringify(currentPayload), vaultKey);
    for (const k of FLEXIBLE_TYPE_FIELDS[item.type]) item[k] = undefined;
  } else {
    for (const k of FLEXIBLE_TYPE_FIELDS[item.type]) item[k] = currentPayload[k];
    item.protectedContentEncrypted = undefined;
  }
  item.sensitive = willBeSensitive;

  await item.save();
  return item;
}

/**
 * Soft-delete a vault item.
 */
async function deleteVaultItem(userId, itemId, vaultKey) {
  const item = await VaultItem.findOne({ _id: itemId, userId, isDeleted: false });
  if (!item) return null;

  // Same guard pattern as get/update: a protected item needs the
  // vault unlocked to be deleted too, not just to be viewed or edited.
  // Deleting doesn't expose the content, but skipping this check would
  // let someone destroy a "protected" item without ever proving they
  // know the master password — which defeats the point of marking it
  // protected in the first place.
  if (itemRequiresUnlock(item.type, item.sensitive) && !vaultKey) {
    const err = new Error("This item is protected — unlock your vault to delete it.");
    err.status = 423;
    throw err;
  }

  item.isDeleted = true;
  item.deletedAt = new Date();
  await item.save();
  return item;
}

/**
 * Star / archive. These neither reveal nor destroy content, so they work
 * while the vault is locked. `timestamps: false` keeps "Updated" meaning
 * "content last edited".
 */
async function setItemFlag(userId, itemId, flag, value) {
  if (!["isStarred", "isArchived"].includes(flag)) throw new Error("Unknown flag.");
  return VaultItem.findOneAndUpdate(
    { _id: itemId, userId, isDeleted: false },
    { $set: { [flag]: Boolean(value) } },
    { new: true, timestamps: false }
  ).select("type title isStarred isArchived");
}

/**
 * Bring an item back from Trash. Restoring exposes nothing, so no unlock.
 */
async function restoreVaultItem(userId, itemId) {
  return VaultItem.findOneAndUpdate(
    { _id: itemId, userId, isDeleted: true },
    { $set: { isDeleted: false }, $unset: { deletedAt: 1 } },
    { new: true, timestamps: false }
  ).select("type title");
}

/**
 * Destroy an item for good. Only items already in Trash qualify, and a
 * protected item needs the vault unlocked (same rule as soft delete).
 */
async function permanentlyDeleteVaultItem(userId, itemId, vaultKey) {
  const item = await VaultItem.findOne({ _id: itemId, userId, isDeleted: true }).select("type sensitive");
  if (!item) return null;

  if (itemRequiresUnlock(item.type, item.sensitive) && !vaultKey) {
    const err = new Error("This item is protected - unlock your vault to delete it permanently.");
    err.status = 423;
    throw err;
  }

  await VaultItem.deleteOne({ _id: item._id, userId });
  return item;
}

/**
 * Permanently delete everything in Trash. If any trashed item is protected
 * the vault must be unlocked, and then nothing is deleted at all.
 */
async function emptyTrash(userId, vaultKey) {
  const trashed = await VaultItem.find({ userId, isDeleted: true }).select("type sensitive");

  if (trashed.some((i) => itemRequiresUnlock(i.type, i.sensitive)) && !vaultKey) {
    const err = new Error("Trash contains protected items - unlock your vault to empty it.");
    err.status = 423;
    throw err;
  }

  const result = await VaultItem.deleteMany({ userId, isDeleted: true });
  return result.deletedCount ?? 0;
}

module.exports = {
  emptyTrash,
setItemFlag,
  restoreVaultItem,
  permanentlyDeleteVaultItem,
createVaultItem,
  listVaultItems,
  getVaultItem,
  updateVaultItem,
  deleteVaultItem,
  itemRequiresUnlock,
};