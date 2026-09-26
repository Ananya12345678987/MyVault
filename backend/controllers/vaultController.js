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

    // Get the authenticated user, including the fields
    // that are normally hidden by the User model.
    const user = await User.findById(req.userId).select(
      "+vaultSalt +vaultKeyCheckHash"
    );

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: "Unauthorized.",
      });
    }

    // Derive the Vault Key from the supplied master password.
    const vaultKey = deriveVaultKey(
      masterPassword,
      user.vaultSalt
    );

    // Check whether the derived key matches the stored verifier.
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

    // If an old vault session exists, remove it first.
    const existingSessionId =
      req.cookies[VAULT_SESSION_COOKIE];

    if (existingSessionId) {
      destroyVaultSession(
        existingSessionId,
        req.userId
      );
    }

    // Store the actual Vault Key only in server memory.
    const vaultSessionId = createVaultSession(
      req.userId,
      vaultKey
    );

    // Send only the random session ID to the client.
    // The actual Vault Key NEVER leaves server memory.
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
      username,
      password,
      secret,
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