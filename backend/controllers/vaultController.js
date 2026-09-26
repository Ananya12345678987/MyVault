const User = require("../models/User");

const {
  deriveVaultKey,
  verifyVaultKeyVerifier,
} = require("../security/crypto");

const {
  createVaultSession,
  destroyVaultSession,
  getVaultSession,
  getVaultKey,
} = require("../security/vaultSessionStore");

const {
  createVaultItem,
  listVaultItems,
  getVaultItem,
  updateVaultItem,
  deleteVaultItem,
} = require("../services/vaultItemService");

const VAULT_SESSION_COOKIE = "vaultSessionId";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

async function unlockVault(req, res, next) {
  try {
    const { masterPassword } = req.body;

    if (
      typeof masterPassword !== "string" ||
      masterPassword.length === 0
    ) {
      return res.status(400).json({
        error: "Master password is required.",
      });
    }

    const user = await User.findById(req.userId).select(
      "+vaultSalt +vaultKeyCheckHash"
    );

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: "Unauthorized.",
      });
    }

    const vaultKey = deriveVaultKey(
      masterPassword,
      user.vaultSalt
    );

    const validMasterPassword =
      await verifyVaultKeyVerifier(
        user.vaultKeyCheckHash,
        vaultKey
      );

    if (!validMasterPassword) {
      return res.status(401).json({
        error: "Invalid master password.",
      });
    }

    const existingSessionId =
      req.cookies[VAULT_SESSION_COOKIE];

    if (existingSessionId) {
      destroyVaultSession(
        existingSessionId,
        req.userId
      );
    }

    const vaultSessionId = createVaultSession(
      req.userId,
      vaultKey
    );

    res.cookie(
      VAULT_SESSION_COOKIE,
      vaultSessionId,
      {
        ...COOKIE_OPTS,
        maxAge: 15 * 60 * 1000,
      }
    );

    return res.json({
      unlocked: true,
    });
  } catch (err) {
    next(err);
  }
}

async function lockVault(req, res, next) {
  try {
    const vaultSessionId =
      req.cookies[VAULT_SESSION_COOKIE];

    if (vaultSessionId) {
      destroyVaultSession(
        vaultSessionId,
        req.userId
      );
    }

    res.clearCookie(
      VAULT_SESSION_COOKIE,
      COOKIE_OPTS
    );

    return res.json({
      unlocked: false,
    });
  } catch (err) {
    next(err);
  }
}

function vaultStatus(req, res) {
  const vaultSessionId =
    req.cookies[VAULT_SESSION_COOKIE];

  const session = getVaultSession(vaultSessionId);

  const unlocked =
    !!session &&
    session.userId === req.userId.toString();

  return res.json({
    unlocked,
  });
}

async function createItem(req, res, next) {
  try {
    const vaultSessionId =
      req.cookies[VAULT_SESSION_COOKIE];

    const vaultKey = getVaultKey(
      vaultSessionId,
      req.userId
    );

    if (!vaultKey) {
      return res.status(423).json({
        error: "Vault is locked.",
      });
    }

    const {
      type,
      title,

      // Password / Secret
      username,
      password,
      secret,

      // Environment variables
      envContent,

      // Database credentials
      dbConnectionUri,
      dbName,
      dbHost,

      // Note
      noteContent,

      // Resource
      url,
      whySaved,
      whatToRemember,

      // Code snippet
      language,
      code,

      // Person
      name,
      email,
      phone,
      company,
      role,

      // Common
      tags,
      data,
    } = req.body;

    if (!type || !title) {
      return res.status(400).json({
        error: "Type and title are required.",
      });
    }

    const item = await createVaultItem({
      userId: req.userId,
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

    return res.status(201).json({
      message: "Vault item created.",
      item: {
        id: item._id,
        type: item.type,
        title: item.title,
        createdAt: item.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function listItems(req, res, next) {
  try {
    const items = await listVaultItems(req.userId);

    return res.json({
      items,
    });
  } catch (err) {
    next(err);
  }
}

async function getItem(req, res, next) {
  try {
    const vaultSessionId =
      req.cookies[VAULT_SESSION_COOKIE];

    const vaultKey = getVaultKey(
      vaultSessionId,
      req.userId
    );

    if (!vaultKey) {
      return res.status(423).json({
        error: "Vault is locked.",
      });
    }

    const item = await getVaultItem(
      req.userId,
      req.params.id,
      vaultKey
    );

    if (!item) {
      return res.status(404).json({
        error: "Vault item not found.",
      });
    }

    return res.json({
      item,
    });
  } catch (err) {
    next(err);
  }
}

async function updateItem(req, res, next) {
  try {
    const vaultSessionId =
      req.cookies[VAULT_SESSION_COOKIE];

    const vaultKey = getVaultKey(
      vaultSessionId,
      req.userId
    );

    if (!vaultKey) {
      return res.status(423).json({
        error: "Vault is locked.",
      });
    }

    const {
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
    } = req.body;

    const item = await updateVaultItem({
      userId: req.userId,
      itemId: req.params.id,
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

    if (!item) {
      return res.status(404).json({
        error: "Vault item not found.",
      });
    }

    return res.json({
      message: "Vault item updated.",
      item: {
        id: item._id,
        type: item.type,
        title: item.title,
        updatedAt: item.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function deleteItem(req, res, next) {
  try {
    const item = await deleteVaultItem(
      req.userId,
      req.params.id
    );

    if (!item) {
      return res.status(404).json({
        error: "Vault item not found.",
      });
    }

    return res.json({
      message: "Vault item deleted.",
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  unlockVault,
  lockVault,
  vaultStatus,
  createItem,
  listItems,
  getItem,
  updateItem,
  deleteItem,
};