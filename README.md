# MyVault — Architecture & Progress Notes

This document is written to be read out loud in an interview. Each section
answers a question a recruiter/interviewer is likely to ask.

## Status: Day 1 — Foundation (Phase 1 of 7)

Built so far: project scaffold, MongoDB user schema, account
registration/login/logout with Argon2id, and the vault key derivation
core (crypto, not yet wired into vault CRUD — that's Day 2).

Not yet built: vault CRUD, auto-lock, UI, reminders, everything past
Phase 1. See `SCOPE.md` (added later) for the honest full breakdown of
what ships by when.

---

## 1. Threat model (what we're defending against)

- **Database compromise**: an attacker who dumps the MongoDB collection
  should get *hashes and ciphertext*, never plaintext passwords, secrets,
  or the vault encryption key.
- **XSS / malicious script in the page**: session tokens live in
  `httpOnly` cookies, not `localStorage`, so JS running on the page can't
  read them even if an XSS bug existed.
- **Credential stuffing / brute force**: rate limiting on `/api/auth/*`
  (10 attempts / 15 min / IP).
- **User enumeration**: login and registration return identical generic
  error messages whether the email exists or the password is wrong.
- **NoSQL injection**: `express-mongo-sanitize` strips `$`/`.` operators
  from all incoming request data before it reaches Mongoose.
- **Stolen session token alone ≠ vault access**: the account session
  (JWT) and vault-unlock state are deliberately separate. Layer 1 lets
  you into the app; Layer 2 lets you decrypt anything.

## 2. What's hashed vs. what's encrypted (the question you WILL get asked)

| Data | Treatment | Why |
|---|---|---|
| Account login password | Argon2id **hash** | Never needs to be recovered — only verified |
| Master password | Never stored at all | Only ever used transiently to derive a key |
| Vault key verifier | Argon2id **hash** of the derived key | Lets us check "right master password?" without storing the key or the password |
| Stored secrets (API keys, DB passwords, etc.) | AES-256-GCM **encryption** | Must be recoverable in plaintext for the user to use them |

## 3. Login flow (Layer 1 — account authentication)

1. Client sends email + password to `POST /api/auth/login`.
2. Server looks up the user, verifies password against `passwordHash`
   with Argon2id.
3. On success, server issues two `httpOnly`, `sameSite=strict` cookies:
   a short-lived access token (15 min) and a longer refresh token (7 days).
4. The vault remains **locked**. No decrypted data is available yet.

## 4. Vault unlock flow (Layer 2 — coming in Day 2, designed now)

1. Client sends the master password to `POST /api/vault/unlock`
   (never the derived key — the key never leaves the server process
   that computes it).
2. Server loads the user's `vaultSalt`, derives the Vault Key with
   `scrypt(masterPassword, vaultSalt)`.
3. Server checks the derived key against `vaultKeyCheckHash` (Argon2id
   verify). Wrong master password → generic 401, vault stays locked.
4. On success, the server marks the session as "vault unlocked" (a
   short-lived server-side flag tied to the session, separate from the
   account JWT) and vault-scoped routes become usable.
5. **The Vault Key itself is derived fresh on every request that needs
   it** (or cached only in server memory for the unlock session's
   lifetime — exact caching strategy is a Day 2 decision) — it is never
   written to disk, logged, or sent to the client.

## 5. Honesty about the "zero-knowledge" question

This architecture is **not** zero-knowledge: the master password is
transmitted to the server (over TLS) to derive the key server-side. A
true zero-knowledge design would derive the key **client-side** (e.g.
via WebCrypto) and only ever send the server pre-encrypted blobs.
That's flagged as a Phase-2/roadmap evolution, not a false claim we make
about the MVP. If asked "is this zero-knowledge?" the honest answer is:
"No — Phase 1 derives keys server-side for development speed; moving
derivation client-side is the designed next step."

## 6. What happens when the browser closes

Covered when auto-lock is implemented (Day 3): the access token's short
expiry plus an explicit "vault locked" state (not just relying on tab-close
events, which are unreliable) means a closed tab requires the master
password again on return, even within the account-session window.

## 7. Folder structure — what lives where and why

```
backend/
├── app.js              Entry point: wires middleware + routes, starts server
├── config/db.js         MongoDB connection, isolated so it's swappable/testable
├── models/               Mongoose schemas — the shape of data at rest
├── controllers/          Request handling: parse input, call services, respond
├── services/             (Day 2+) business logic, e.g. vault encryption orchestration
├── security/             crypto.js (hashing/KDF/AES), tokens.js (JWT) — the only
│                         place cryptographic primitives are called directly
├── middleware/           requireAuth (session check), rateLimiter, errorHandler
├── validators/           Zod schemas — nothing touches the DB unvalidated
├── routes/               Thin route -> controller wiring, no logic
└── jobs/                 (later) scheduled tasks, e.g. trash auto-purge
```

The principle: if asked "why does `security/crypto.js` exist separately
from controllers?", the answer is — it's the single place that imports
`crypto`/`argon2` directly, so a security review only has to audit one
file, and it's independently unit-testable without spinning up Express.
