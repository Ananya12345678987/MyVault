const VaultItem = require("../models/VaultItem");
const { encryptField, decryptField } = require("../security/crypto");

// Types that are ALWAYS encrypted — no user choice, because the entire
// point of the type is to hold a credential.
const SENSITIVE_FIELD_BY_TYPE = {
  password: "passwordEncrypted",
  secret: "secretEncrypted",
  env: "envContentEncrypted",
  dbCredential: "dbConnectionUriEncrypted",
};

// Types where the USER decides, per item, whether it's encrypted.
const FLEXIBLE_TYPES = ["note", "resource", "snippet", "person"];

// Which fields belong to each flexible type — used to bundle them into
// one JSON blob when the user marks that item sensitive.
const FLEXIBLE_TYPE_FIELDS = {
  note: ["noteContent"],
  resource: ["url", "whySaved", "whatToRemember"],
  snippet: ["language", "code"],
  person: ["name", "email", "phone", "company", "role"],
};

/**
 * Does creating/editing this item need the vault unlocked right now?
 *  - password/secret/env/dbCredential: always yes.
 *  - note/resource/snippet/person: only if THIS item's sensitive flag
 *    is (or is becoming) true.
 *  - anything else: no.
 */
function itemRequiresUnlock(type, sensitiveFlag) {
  if (SENSITIVE_FIELD_BY_TYPE[type]) return true;
  if (FLEXIBLE_TYPES.includes(type)) return Boolean(sensitiveFlag);
  return false;
}

/**
 * Create a vault item. Sensitive values are encrypted before storage.
 */
async function createVaultItem({
  userId, vaultKey, type, title,
  username, password, secret, envContent, dbConnectionUri, dbName, dbHost,
  sensitive, noteContent, url, whySaved, whatToRemember, language, code,
  name, email, phone, company, role, tags, data = {},
}) {
  const fields = { noteContent, url, whySaved, whatToRemember, language, code, name, email, phone, company, role };
  const doc = { userId, type, title, tags, data };

  const alwaysSensitiveField = SENSITIVE_FIELD_BY_TYPE[type];

  if (alwaysSensitiveField) {
    const rawValue = { password, secret, envContent, dbConnectionUri }[
      {
        passwordEncrypted: "password",
        secretEncrypted: "secret",
        envContentEncrypted: "envContent",
        dbConnectionUriEncrypted: "dbConnectionUri",
      }[alwaysSensitiveField]
    ];
    if (rawValue) doc[alwaysSensitiveField] = encryptField(rawValue, vaultKey);
    if (type === "password" && username) doc.usernameEncrypted = encryptField(username, vaultKey);
    doc.dbName = dbName;
    doc.dbHost = dbHost;
  } else if (FLEXIBLE_TYPES.includes(type)) {
    doc.sensitive = sensitive;
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

  // <-- THE GUARD -->
  if (itemRequiresUnlock(item.type, item.sensitive) && !vaultKey) {
    const err = new Error("This item is protected — unlock your vault to view it.");
    err.status = 423;
    throw err;
  }

  const result = {
    id: item._id,
    type: item.type,
    title: item.title,
    sensitive: FLEXIBLE_TYPES.includes(item.type) ? item.sensitive : null,
    username: null,
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

  if (item.usernameEncrypted) {
    result.username = decryptField(item.usernameEncrypted, vaultKey);
  }

  const alwaysSensitiveField = SENSITIVE_FIELD_BY_TYPE[item.type];
  if (alwaysSensitiveField && item[alwaysSensitiveField]) {
    result.value = decryptField(item[alwaysSensitiveField], vaultKey);
  }

  if (FLEXIBLE_TYPES.includes(item.type)) {
    if (item.sensitive) {
      if (item.protectedContentEncrypted) {
        const payload = JSON.parse(decryptField(item.protectedContentEncrypted, vaultKey));
        Object.assign(result, payload);
        if (item.type === "note") result.value = payload.noteContent ?? null;
      }
    } else {
      for (const key of FLEXIBLE_TYPE_FIELDS[item.type]) {
        result[key] = item[key] ?? null;
      }
      if (item.type === "note") result.value = item.noteContent ?? null;
    }
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
  name, email, phone, company, role, tags, data,
}) {
  const item = await VaultItem.findOne({ _id: itemId, userId, isDeleted: false }).select(
    "+usernameEncrypted +passwordEncrypted +secretEncrypted +envContentEncrypted " +
      "+dbConnectionUriEncrypted +noteContent +protectedContentEncrypted"
  );
  if (!item) return null;

  // <-- THE GUARD -->
  const willBeSensitive = sensitive !== undefined ? sensitive : item.sensitive;
  if (itemRequiresUnlock(item.type, item.sensitive || willBeSensitive) && !vaultKey) {
    const err = new Error("This item is protected — unlock your vault to edit it.");
    err.status = 423;
    throw err;
  }

  if (title !== undefined) item.title = title;
  if (tags !== undefined) item.tags = tags;
  if (data !== undefined) item.data = data;
  if (dbName !== undefined) item.dbName = dbName;
  if (dbHost !== undefined) item.dbHost = dbHost;

  const alwaysSensitiveField = SENSITIVE_FIELD_BY_TYPE[item.type];
  if (alwaysSensitiveField) {
    const rawValue = { password, secret, envContent, dbConnectionUri }[
      {
        passwordEncrypted: "password",
        secretEncrypted: "secret",
        envContentEncrypted: "envContent",
        dbConnectionUriEncrypted: "dbConnectionUri",
      }[alwaysSensitiveField]
    ];
    if (rawValue !== undefined) {
      item[alwaysSensitiveField] = rawValue ? encryptField(rawValue, vaultKey) : undefined;
    }
    if (username !== undefined) {
      item.usernameEncrypted = username ? encryptField(username, vaultKey) : undefined;
    }
  } else if (FLEXIBLE_TYPES.includes(item.type)) {
    const wasSensitive = item.sensitive;
    const newFieldValues = { noteContent, url, whySaved, whatToRemember, language, code, name, email, phone, company, role };

    if (willBeSensitive) {
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
      item.protectedContentEncrypted = encryptField(JSON.stringify(currentPayload), vaultKey);
      for (const k of FLEXIBLE_TYPE_FIELDS[item.type]) item[k] = undefined;
    } else {
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
      for (const k of FLEXIBLE_TYPE_FIELDS[item.type]) item[k] = currentPayload[k];
      item.protectedContentEncrypted = undefined;
    }
    item.sensitive = willBeSensitive;
  }

  await item.save();
  return item;
}

/**
 * Soft-delete a vault item.
 */
async function deleteVaultItem(userId, itemId) {
  const item = await VaultItem.findOneAndUpdate(
    { _id: itemId, userId, isDeleted: false },
    { $set: { isDeleted: true } },
    { new: true }
  );
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