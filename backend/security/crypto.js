const argon2 = require("argon2");
const crypto = require("crypto");

/**
 * ============================================================================
 * MyVault Cryptography Core
 * ============================================================================
 * Every function here wraps an established library primitive.
 * Nothing in this file implements a cryptographic algorithm from scratch —
 * per the project's own security rule (no hand-rolled AES/Argon2/PBKDF2).
 *
 * Two distinct purposes, never confused:
 *   HASHING    -> account password. One-way. We only ever verify it.
 *   KEY DERIVATION -> master password -> Vault Key. Used to encrypt/decrypt.
 * ============================================================================
 */

const ARGON2_OPTS = {
  type: argon2.argon2id,
  memoryCost: 19456, // ~19 MB, OWASP-recommended baseline for argon2id
  timeCost: 2,
  parallelism: 1,
};

// ---------------------------------------------------------------------------
// 1. ACCOUNT PASSWORD HASHING (Layer 1 — login)
// ---------------------------------------------------------------------------

async function hashPassword(plainPassword) {
  return argon2.hash(plainPassword, ARGON2_OPTS);
}

async function verifyPassword(hash, plainPassword) {
  return argon2.verify(hash, plainPassword);
}

// ---------------------------------------------------------------------------
// 2. VAULT KEY DERIVATION (Layer 2 — master password / vault unlock)
// ---------------------------------------------------------------------------

/**
 * Generates a fresh random salt for a user's vault at setup time.
 * Stored in the User document (vaultSalt). A salt is NOT secret —
 * its only job is to make every user's derivation unique, so precomputed
 * rainbow-table-style attacks against the KDF don't scale across users.
 */
function generateVaultSalt() {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Derives a 256-bit Vault Key from the user's master password + their
 * stored salt, using scrypt (a memory-hard KDF suitable for deriving
 * symmetric keys — distinct from Argon2id which we use for password
 * hashing and verification, not key output.
 *
 * IMPORTANT: the returned Buffer is the live encryption key. It must
 * NEVER be logged, stored, or sent to the client. Callers use it
 * immediately for encrypt/decrypt and let it go out of scope.
 */
function deriveVaultKey(masterPassword, vaultSaltHex) {
  const salt = Buffer.from(vaultSaltHex, "hex");
  return crypto.scryptSync(masterPassword, salt, 32, {
    N: 16384, // CPU/memory cost
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
}

/**
 * Produces a storable "verifier hash" for the derived vault key, so we
 * can check "did the user unlock with the right master password" at
 * /api/vault/unlock WITHOUT storing the key itself and WITHOUT storing
 * the master password. We hash the derived key (never the raw key) with
 * Argon2id, exactly like a password hash.
 *
 * Security property: even a full DB compromise gives an attacker only
 * this verifier hash — not the key, not the master password, and it
 * cannot be used to decrypt any vault item directly.
 */
async function hashVaultKeyVerifier(vaultKeyBuffer) {
  return argon2.hash(vaultKeyBuffer, ARGON2_OPTS);
}

async function verifyVaultKeyVerifier(storedHash, vaultKeyBuffer) {
  return argon2.verify(storedHash, vaultKeyBuffer);
}

// ---------------------------------------------------------------------------
// 3. FIELD-LEVEL ENCRYPTION (AES-256-GCM, authenticated encryption)
// ---------------------------------------------------------------------------

/**
 * Encrypts a plaintext string with the given Vault Key.
 * Returns a single string combining iv + authTag + ciphertext (all
 * hex-encoded, colon-separated) so it's simple to store in one Mongo field.
 *
 * AES-256-GCM gives us confidentiality AND integrity (the authTag
 * detects tampering) — required for anything we call a "secret".
 */
function encryptField(plaintext, vaultKeyBuffer) {
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", vaultKeyBuffer, iv);

  const encrypted = Buffer.concat([
    cipher.update(String(plaintext), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

/**
 * Decrypts a string produced by encryptField. Throws if the authTag
 * doesn't verify (tampered ciphertext or wrong key) — callers should
 * treat that as "cannot decrypt", never silently return partial data.
 */
function decryptField(payload, vaultKeyBuffer) {
  const [ivHex, authTagHex, dataHex] = String(payload).split(":");
  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error("Malformed encrypted payload.");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    vaultKeyBuffer,
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateVaultSalt,
  deriveVaultKey,
  hashVaultKeyVerifier,
  verifyVaultKeyVerifier,
  encryptField,
  decryptField,
};
