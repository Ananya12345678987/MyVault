const User = require("../models/User");
const {
  hashPassword,
  verifyPassword,
  generateVaultSalt,
  deriveVaultKey,
  hashVaultKeyVerifier,
} = require("../security/crypto");
const { signAccessToken, signRefreshToken } = require("../security/tokens");
const { registerSchema, loginSchema } = require("../validators/authValidators");

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
};

/**
 * POST /api/auth/register
 *
 * Sets up BOTH security layers at once:
 *  1. Account password -> Argon2id hash (passwordHash)
 *  2. Master password -> vault salt generated, vault key derived ONCE
 *     here to produce a verifier hash (vaultKeyCheckHash), then the
 *     derived key is discarded immediately. It is never stored.
 *
 * We intentionally ask for both passwords at registration (rather than
 * defaulting master password = account password) so a compromised
 * account password alone never implies vault access.
 */
async function register(req, res, next) {
  try {
    const { email, password, masterPassword } = registerSchema.parse(req.body);

    const existing = await User.findOne({ email });
    if (existing) {
      // Generic message — do not reveal that this email is already taken
      // via a different wording than any other validation failure.
      return res.status(400).json({ error: "Unable to create account with these details." });
    }

    const passwordHash = await hashPassword(password);

    const vaultSalt = generateVaultSalt();
    const vaultKey = deriveVaultKey(masterPassword, vaultSalt); // Buffer, transient
    const vaultKeyCheckHash = await hashVaultKeyVerifier(vaultKey);
    // vaultKey goes out of scope here — never stored, never logged.

    const user = await User.create({
      email,
      passwordHash,
      vaultSalt,
      vaultKeyCheckHash,
      vaultSetupComplete: true,
    });

    issueSessionCookies(res, user._id.toString());

    return res.status(201).json({
      user: { id: user._id, email: user.email },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Layer 1 only — does not unlock the vault. Client must call
 * POST /api/vault/unlock separately with the master password.
 */
async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email }).select("+passwordHash");

    // Same generic error whether the email doesn't exist or the password
    // is wrong — prevents user enumeration via error message differences.
    const genericError = () => res.status(401).json({ error: "Invalid email or password." });

    if (!user || !user.isActive) return genericError();

    const validPassword = await verifyPassword(user.passwordHash, password);
    if (!validPassword) return genericError();

    issueSessionCookies(res, user._id.toString());

    return res.json({ user: { id: user._id, email: user.email } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * Clears session cookies. Also relies on the client-side vault store
 * being cleared (see frontend vault context) — the server holds no
 * decrypted vault state to clean up here, by design.
 */
function logout(req, res) {
  res.clearCookie("accessToken", COOKIE_OPTS);
  res.clearCookie("refreshToken", COOKIE_OPTS);
  return res.status(204).send();
}

/**
 * GET /api/auth/me
 * Returns the logged-in user's public profile. Never selects
 * passwordHash, vaultSalt, or vaultKeyCheckHash (they default to
 * select: false in the schema).
 */
async function me(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found." });
    return res.json({
      user: {
        id: user._id,
        email: user.email,
        settings: user.settings,
        vaultSetupComplete: user.vaultSetupComplete,
      },
    });
  } catch (err) {
    next(err);
  }
}

function issueSessionCookies(res, userId) {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);
  res.cookie("accessToken", accessToken, {
    ...COOKIE_OPTS,
    maxAge: 15 * 60 * 1000,
  });
  res.cookie("refreshToken", refreshToken, {
    ...COOKIE_OPTS,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

module.exports = { register, login, logout, me };
