const { verifyAccessToken } = require("../security/tokens");

/**
 * Verifies the account session (Layer 1 only). Does NOT check vault
 * unlock state — routes that touch decrypted vault data must also
 * pass through requireVaultUnlocked (middleware/vaultGuard.js).
 *
 * Reads the token from an httpOnly cookie rather than an Authorization
 * header so it's inaccessible to JS running in the page (XSS mitigation).
 */
function requireAuth(req, res, next) {
  const token = req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  try {
    const payload = verifyAccessToken(token);
    if (payload.type !== "access") throw new Error("Wrong token type");
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expired or invalid." });
  }
}

module.exports = requireAuth;
