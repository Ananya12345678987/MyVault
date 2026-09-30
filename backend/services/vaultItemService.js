const VaultItem = require("../models/VaultItem");
const { encryptField, decryptField } = require("../security/crypto");

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
}) {
  if (!FLEXIBLE_TYPES.includes(type)) {
    const err = new Error(`Unsupported item type: ${type}`);
    err.status = 400;
    throw err;
  }

  const fields = { password, secret, envContent, dbConnectionUri, noteContent, url, whySaved, whatToRemember, language, code, name, email, phone, company, role };

  const doc = { userId, type, title, tags, notes, data, sensitive };

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
 * List items without revealing sensitive values — safe while locked.
 */
async function listVaultItems(userId) {
  return VaultItem.find({ userId, isDeleted: false })
    .select(
      "type title sensitive dbName dbHost url whySaved whatToRemember language code name email phone company role tags data createdAt updatedAt"
    )
    .sort({ updatedAt: -1 });
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
  userId, itemId, vaultKey, title,
  username, password, secret, envContent, dbConnectionUri, dbName, dbHost,
  sensitive, noteContent, url, whySaved, whatToRemember, language, code,
  name, email, phone, company, role, tags, notes, data,
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
  if (notes !== undefined) item.notes = notes;
  if (data !== undefined) item.data = data;
  if (dbName !== undefined) item.dbName = dbName;
  if (dbHost !== undefined) item.dbHost = dbHost;
  if (username !== undefined) item.username = username;
  if (website !== undefined) item.website = website;

  const wasSensitive = item.sensitive;
  const newFieldValues = { password, secret, envContent, dbConnectionUri, noteContent, url, whySaved, whatToRemember, language, code, name, email, phone, company, role };

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
  await item.save();
  return item;
}

module.exports = {
  createVaultItem,
  listVaultItems,
  getVaultItem,
  updateVaultItem,
  deleteVaultItem,
  itemRequiresUnlock,
};