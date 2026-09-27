const VaultItem = require("../models/VaultItem");

const {
  encryptField,
  decryptField,
} = require("../security/crypto");

/**
 * Maps each vault item type to the encrypted field
 * that contains its sensitive value.
 *
 * null means the item type has no sensitive value.
 */
const SENSITIVE_FIELD_BY_TYPE = {
  password: "passwordEncrypted",
  secret: "secretEncrypted",
  env: "envContentEncrypted",
  dbCredential: "dbConnectionUriEncrypted",

  resource: null,
  snippet: null,
  person: null,
};

/**
 * Determines whether an item requires the master password.
 *
 * Notes are special:
 * - sensitive: true  -> requires unlock
 * - sensitive: false -> does not require unlock
 *
 * All other sensitive types keep their existing behavior.
 */
function itemRequiresUnlock(type, noteSensitive) {
  if (type === "note") {
    return noteSensitive === true;
  }

  return Boolean(SENSITIVE_FIELD_BY_TYPE[type]);
}

/**
 * Create a vault item.
 *
 * Sensitive values are encrypted before being stored
 * in MongoDB.
 */
async function createVaultItem({
  userId,
  vaultKey,
  type,
  title,

  username,
  password,
  secret,
  envContent,

  dbConnectionUri,
  dbName,
  dbHost,
  noteContent,
  sensitive,

  url,
  whySaved,
  whatToRemember,

  language,
  code,

  name,
  email,
  phone,
  company,
  role,

  tags,
  data = {},
}) {
  const encryptedFields = {};

  const sensitiveField = SENSITIVE_FIELD_BY_TYPE[type];

  if (sensitiveField === "passwordEncrypted" && password) {
    encryptedFields.passwordEncrypted = encryptField(
      password,
      vaultKey
    );
  }

  if (sensitiveField === "secretEncrypted" && secret) {
    encryptedFields.secretEncrypted = encryptField(
      secret,
      vaultKey
    );
  }

  if (sensitiveField === "envContentEncrypted" && envContent) {
    encryptedFields.envContentEncrypted = encryptField(
      envContent,
      vaultKey
    );
  }

  if (
    sensitiveField === "dbConnectionUriEncrypted" &&
    dbConnectionUri
  ) {
    encryptedFields.dbConnectionUriEncrypted = encryptField(
      dbConnectionUri,
      vaultKey
    );
  }

  if (type === "note" && noteContent !== undefined) {
  if (sensitive === true) {
    encryptedFields.noteContentEncrypted = encryptField(
      noteContent,
      vaultKey
    );
  } else {
    encryptedFields.noteContent = noteContent;
  }
}  

  // Username is only relevant to password/login items.
  if (type === "password" && username) {
    encryptedFields.usernameEncrypted = encryptField(
      username,
      vaultKey
    );
  }

  const item = new VaultItem({
    userId,
    type,
    title,

    sensitive,

    ...encryptedFields,

    dbName,
    dbHost,

    url,
    whySaved,
    whatToRemember,

    language,
    code,

    name,
    email,
    phone,
    company,
    role,

    tags,
    data,
  });

  return item.save();
}

/**
 * Get vault items without revealing sensitive values.
 *
 * This can safely be used while the vault is locked.
 */
async function listVaultItems(userId) {
  return VaultItem.find({
    userId,
    isDeleted: false,
  })
    .select(
  "type title sensitive dbName dbHost url whySaved whatToRemember language code name email phone company role tags data createdAt updatedAt"
)
    .sort({ updatedAt: -1 });
}

/**
 * Get one vault item and decrypt its sensitive value.
 */
async function getVaultItem(userId, itemId, vaultKey) {
  const item = await VaultItem.findOne({
    _id: itemId,
    userId,
    isDeleted: false,
  }).select(
    "+usernameEncrypted " +
      "+passwordEncrypted " +
      "+secretEncrypted " +
      "+envContentEncrypted " +
      "+dbConnectionUriEncrypted " +
      "+noteContent " +
      "+noteContentEncrypted"
  );



  if (!item) {
    return null;
  }

  const result = {
    id: item._id,
    type: item.type,
    title: item.title,

    sensitive: item.type === "note"
    ? item.sensitive
    : null,

    username: null,
    value: null,

    dbName: item.dbName || null,
    dbHost: item.dbHost || null,

    url: item.url || null,
    whySaved: item.whySaved || null,
    whatToRemember: item.whatToRemember || null,

    language: item.language || null,
    code: item.code || null,

    name: item.name || null,
    email: item.email || null,
    phone: item.phone || null,
    company: item.company || null,
    role: item.role || null,

    tags: item.tags || [],
    data: item.data,

    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };

  if (item.usernameEncrypted) {
    result.username = decryptField(
      item.usernameEncrypted,
      vaultKey
    );
  }

  switch (item.type) {
    case "password":
      if (item.passwordEncrypted) {
        result.value = decryptField(
          item.passwordEncrypted,
          vaultKey
        );
      }
      break;

    case "secret":
      if (item.secretEncrypted) {
        result.value = decryptField(
          item.secretEncrypted,
          vaultKey
        );
      }
      break;

    case "env":
      if (item.envContentEncrypted) {
        result.value = decryptField(
          item.envContentEncrypted,
          vaultKey
        );
      }
      break;

    case "dbCredential":
      if (item.dbConnectionUriEncrypted) {
        result.value = decryptField(
          item.dbConnectionUriEncrypted,
          vaultKey
        );
      }
      break;

    case "note":
  if (item.sensitive === true) {
    if (item.noteContentEncrypted) {
      result.value = decryptField(
        item.noteContentEncrypted,
        vaultKey
      );
    }
  } else {
    result.value = item.noteContent || null;
  }
  break;

    case "resource":
    case "snippet":
    case "person":
      // These types do not contain encrypted sensitive values.
      break;
  }

  return result;
}

/**
 * Update a vault item.
 */
async function updateVaultItem({
  userId,
  itemId,
  vaultKey,
  type,
  title,

  username,
  password,
  secret,
  envContent,
  dbConnectionUri,
  noteContent,
  sensitive,

  dbName,
  dbHost,

  url,
  whySaved,
  whatToRemember,

  language,
  code,

  name,
  email,
  phone,
  company,
  role,

  tags,
  data,
}) {
  const item = await VaultItem.findOne({
    _id: itemId,
    userId,
    isDeleted: false,
  }).select(
    "+usernameEncrypted " +
      "+passwordEncrypted " +
      "+secretEncrypted " +
      "+envContentEncrypted " +
      "+dbConnectionUriEncrypted " +
      "+noteContent " +
      "+noteContentEncrypted "

    );

  if (!item) {
    return null;
  }

  if (sensitive !== undefined) {
  item.sensitive = sensitive;
}

  if (type !== undefined) {
    item.type = type;
  }

  if (title !== undefined) {
    item.title = title;
  }

  if (username !== undefined) {
    item.usernameEncrypted =
      username
        ? encryptField(username, vaultKey)
        : undefined;
  }

  if (password !== undefined) {
    item.passwordEncrypted =
      password
        ? encryptField(password, vaultKey)
        : undefined;
  }

  if (secret !== undefined) {
    item.secretEncrypted =
      secret
        ? encryptField(secret, vaultKey)
        : undefined;
  }

  if (envContent !== undefined) {
    item.envContentEncrypted =
      envContent
        ? encryptField(envContent, vaultKey)
        : undefined;
  }

  if (dbConnectionUri !== undefined) {
    item.dbConnectionUriEncrypted =
      dbConnectionUri
        ? encryptField(dbConnectionUri, vaultKey)
        : undefined;
  }

  if (noteContent !== undefined) {
  if (item.type === "note" && item.sensitive === true) {
    item.noteContentEncrypted = noteContent
      ? encryptField(noteContent, vaultKey)
      : undefined;

    item.noteContent = undefined;
  } else if (item.type === "note") {
    item.noteContent = noteContent;
    item.noteContentEncrypted = undefined;
  }
}

  if (dbName !== undefined) {
    item.dbName = dbName;
  }

  if (dbHost !== undefined) {
    item.dbHost = dbHost;
  }

  if (url !== undefined) {
    item.url = url;
  }

  if (whySaved !== undefined) {
    item.whySaved = whySaved;
  }

  if (whatToRemember !== undefined) {
    item.whatToRemember = whatToRemember;
  }

  if (language !== undefined) {
    item.language = language;
  }

  if (code !== undefined) {
    item.code = code;
  }

  if (name !== undefined) {
    item.name = name;
  }

  if (email !== undefined) {
    item.email = email;
  }

  if (phone !== undefined) {
    item.phone = phone;
  }

  if (company !== undefined) {
    item.company = company;
  }

  if (role !== undefined) {
    item.role = role;
  }

  if (tags !== undefined) {
    item.tags = tags;
  }

  if (data !== undefined) {
    item.data = data;
  }

  await item.save();

  return item;
}

/**
 * Soft-delete a vault item.
 */
async function deleteVaultItem(userId, itemId) {
  const item = await VaultItem.findOneAndUpdate(
    {
      _id: itemId,
      userId,
      isDeleted: false,
    },
    {
      $set: {
        isDeleted: true,
      },
    },
    {
      new: true,
    }
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