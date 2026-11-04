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

// The vault locks itself after this long WITHOUT activity. Every vault
// request counts as activity, so while you are working it stays unlocked.
const IDLE_MS = (Number(process.env.VAULT_IDLE_MINUTES) || 30) * 60 * 1000;

// Remove sessions nobody has used for a while (so keys don't sit in memory).
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastSeen > IDLE_MS) sessions.delete(id);
  }
}, 60 * 1000).unref();

function createVaultSession(userId, vaultKey) {
  const vaultSessionId = crypto.randomBytes(32).toString("hex");

  sessions.set(vaultSessionId, {
    userId: userId.toString(),
        vaultKey,
    createdAt: Date.now(),
    lastSeen: Date.now(),
  });

  return vaultSessionId;
}

function getVaultSession(vaultSessionId) {
   if (!vaultSessionId) return null;

  const session = sessions.get(vaultSessionId);
  if (!session) return null;

  // Idle too long: lock it.
  if (Date.now() - session.lastSeen > IDLE_MS) {
    sessions.delete(vaultSessionId);
    return null;
  }

  session.lastSeen = Date.now(); // activity keeps the vault unlocked
  return session;
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