const VaultItem = require("../models/VaultItem");
const {
  encryptField,
  decryptField,
} = require("../security/crypto");

/**
 * Create a vault item.
 *
 * Sensitive fields are encrypted before being stored in MongoDB.
 */
async function createVaultItem({
  userId,
  vaultKey,
  type,
  title,
  username,
  password,
  secret,
  data = {},
}) {
  const item = new VaultItem({
    userId,
    type,
    title,
    usernameEncrypted: username
      ? encryptField(username, vaultKey)
      : undefined,
    passwordEncrypted: password
      ? encryptField(password, vaultKey)
      : undefined,
    secretEncrypted: secret
      ? encryptField(secret, vaultKey)
      : undefined,
    data,
  });

  return item.save();
}

/**
 * Get vault items without revealing encrypted secrets.
 *
 * This can safely be used while the vault is locked.
 */
async function listVaultItems(userId) {
  return VaultItem.find({
    userId,
    isDeleted: false,
  })
    .select("type title data createdAt updatedAt")
    .sort({ updatedAt: -1 });
}

/**
 * Get one vault item and decrypt its sensitive fields.
 */
async function getVaultItem(userId, itemId, vaultKey) {
  const item = await VaultItem.findOne({
    _id: itemId,
    userId,
    isDeleted: false,
  }).select(
    "+usernameEncrypted +passwordEncrypted +secretEncrypted"
  );

  if (!item) {
    return null;
  }

  return {
    id: item._id,
    type: item.type,
    title: item.title,

    username: item.usernameEncrypted
      ? decryptField(item.usernameEncrypted, vaultKey)
      : null,

    password: item.passwordEncrypted
      ? decryptField(item.passwordEncrypted, vaultKey)
      : null,

    secret: item.secretEncrypted
      ? decryptField(item.secretEncrypted, vaultKey)
      : null,

    data: item.data,

    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
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
  data,
}) {
  const item = await VaultItem.findOne({
    _id: itemId,
    userId,
    isDeleted: false,
  }).select(
    "+usernameEncrypted +passwordEncrypted +secretEncrypted"
  );

  if (!item) {
    return null;
  }

  if (type !== undefined) {
    item.type = type;
  }

  if (title !== undefined) {
    item.title = title;
  }

  if (username !== undefined) {
    item.usernameEncrypted = username
      ? encryptField(username, vaultKey)
      : undefined;
  }

  if (password !== undefined) {
    item.passwordEncrypted = password
      ? encryptField(password, vaultKey)
      : undefined;
  }

  if (secret !== undefined) {
    item.secretEncrypted = secret
      ? encryptField(secret, vaultKey)
      : undefined;
  }

  if (data !== undefined) {
    item.data = data;
  }

  await item.save();

  return item;
}

/**
 * Soft-delete a vault item.
 *
 * No decryption is required.
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
};