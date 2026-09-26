const crypto = require("crypto");

// In-memory vault sessions.
//
// IMPORTANT:
// - The Vault Key is NEVER stored in MongoDB.
// - The Vault Key is NEVER placed inside a JWT.
// - The Vault Key lives here only while the vault is unlocked.
//
// MVP limitation:
// - Restarting the server clears all sessions.
// - Multiple server instances would have separate stores.
// A production deployment would need a shared session mechanism
// or a client-side key derivation architecture.

const sessions = new Map();

function createVaultSession(userId, vaultKey) {
  const vaultSessionId = crypto.randomBytes(32).toString("hex");

  sessions.set(vaultSessionId, {
    userId: userId.toString(),
    vaultKey,
    createdAt: Date.now(),
  });

  return vaultSessionId;
}

function getVaultSession(vaultSessionId) {
  if (!vaultSessionId) return null;

  return sessions.get(vaultSessionId) || null;
}

function getVaultKey(vaultSessionId, userId) {
  const session = getVaultSession(vaultSessionId);

  if (!session) return null;

  // Prevent one user's authenticated session from
  // retrieving another user's Vault Key.
  if (session.userId !== userId.toString()) {
    return null;
  }

  return session.vaultKey;
}

function destroyVaultSession(vaultSessionId, userId) {
  const session = getVaultSession(vaultSessionId);

  if (!session) return false;

  // Only the owner can destroy the session.
  if (session.userId !== userId.toString()) {
    return false;
  }

  sessions.delete(vaultSessionId);
  return true;
}

module.exports = {
  createVaultSession,
  getVaultSession,
  getVaultKey,
  destroyVaultSession,
};