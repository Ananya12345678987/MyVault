const mongoose = require("mongoose");

/**
 * User schema — the two security layers live side by side here on purpose,
 * so the distinction is visible in the data model itself:
 *
 * 1. ACCOUNT AUTHENTICATION (login)
 *    - passwordHash: Argon2id hash of the account password.
 *      This is HASHING — one-way, never decrypted, only verified.
 *
 * 2. VAULT UNLOCK (master password)
 *    - vaultSalt: a random per-user salt used as KDF input alongside the
 *      master password to derive the Vault Key at unlock time.
 *    - vaultKeyCheckHash: NOT the vault key itself. It's a hash of the
 *      derived key (or a KDF-derived verifier), used only to check "did
 *      the user type the right master password" without ever storing
 *      the actual encryption key. If this field were compromised alone,
 *      it cannot be used to decrypt any vault item.
 *    - The Vault Key itself is NEVER persisted anywhere. It exists only
 *      in server memory for the duration of a single request/operation
 *      that needs it, then is discarded. See security/vaultCrypto.js.
 */
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // never returned by default on .find()/.findOne()
    },

    // --- Vault unlock (Layer 2) ---
    vaultSalt: {
      type: String, // hex-encoded random salt, generated at vault setup
      required: true,
      select: false,
    },
    vaultKeyCheckHash: {
      type: String, // Argon2id hash of the derived vault key verifier
      required: true,
      select: false,
    },
    vaultSetupComplete: {
      type: Boolean,
      default: false,
    },

    // --- Settings referenced across features ---
    settings: {
      autoLockMinutes: { type: Number, default: 15 }, // 0 = never
      clipboardClearSeconds: { type: Number, default: 60 }, // 0 = never
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
