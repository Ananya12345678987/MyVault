const jwt = require("jsonwebtoken");

/**
 * Account session tokens (Layer 1). These prove "who is logged in" —
 * they carry NO vault-unlock state and NO encryption key material.
 * Vault unlock is tracked separately (see middleware/vaultGuard.js),
 * so a stolen access token alone never grants access to decrypted secrets.
 */

function signAccessToken(userId) {
  return jwt.sign({ sub: userId, type: "access" }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
  });
}

function signRefreshToken(userId) {
  return jwt.sign({ sub: userId, type: "refresh" }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
