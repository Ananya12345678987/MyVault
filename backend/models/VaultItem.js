const mongoose = require("mongoose");

// One entry in a key/value item (Password, API Key, Environment, Database)
// or in a Person's free-form extra info. For protected items only
// { id, key, protected } is stored here; the value and info live inside
// the encrypted blob (see services/vaultFields.js).
const fieldSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    key: { type: String, required: true, trim: true, maxlength: 200 },
    protected: { type: Boolean, default: false },
    value: { type: String },
    info: {
      type: [
        {
          _id: false,
          label: { type: String, trim: true, maxlength: 200 },
          text: { type: String, maxlength: 2000 },
        },
      ],
      default: undefined,
    },
  },
  { _id: false }
);

const vaultItemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "password",
        "secret",
        "env",
        "dbCredential",
        "note",
        "resource",
        "snippet",
        "person",
      ],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    // Password / login fields
        usernameEncrypted: {
      type: String,
      select: false,
    },

    // Plaintext username — password items' username is always visible
    // metadata, never part of the encrypted payload, regardless of
    // whether the password itself is protected.
        username: {
      type: String,
      trim: true,
      maxlength: 200,
    },

    // The "Key" in the Password form — the site/service name, e.g.
    // "reddit.com". Always plaintext metadata, like username, so you
    // can browse and tell entries apart even when locked.
    website: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    passwordEncrypted: {
      type: String,
      select: false,
    },

    // Generic secret
    secretEncrypted: {
      type: String,
      select: false,
    },

    // Environment variables
    envContentEncrypted: {
      type: String,
      select: false,
    },

    // Database credentials
        dbConnectionUriEncrypted: {
      type: String,
      select: false,
    },

    // Plaintext counterparts — used when the user chooses NOT to
    // protect this item. Mirrors the note/resource/snippet/person
    // pattern: exactly one of the plain/encrypted pair holds data at
    // any time, decided per-item by `sensitive`.
    password: { type: String, trim: true },
    secret: { type: String, trim: true },
    envContent: { type: String },
    dbConnectionUri: { type: String, trim: true },

    dbName: {
      type: String,
      trim: true,
    },

    dbHost: {
      type: String,
      trim: true,
    },

    // Notes
    // Notes
        // Per-item protection choice — applies to note, resource, snippet,
    // and person. When true, that item's type-specific fields (below)
    // are NOT stored in their normal plaintext columns; instead they're
    // bundled into one JSON object and AES-256-GCM encrypted into
    // `protectedContentEncrypted`. When false, the plaintext columns
    // are used directly and protectedContentEncrypted stays empty.
    // password/secret/env/dbCredential don't use this — they're ALWAYS
    // encrypted, by design, since they exist specifically to hold a
    // credential; making that optional would be the "fake security"
    // the project spec explicitly forbids.
        // Every type now carries this choice — not just the original 4.
    sensitive: {
      type: Boolean,
      required: true,
    },

    protectedContentEncrypted: {
      type: String,
      select: false,
    },

    // Plaintext note content — used only when sensitive === false.
    noteContent: {
      type: String,
      select: false,
    },
   

    // Non-sensitive resource fields
    url: {
      type: String,
      trim: true,
    },

    whySaved: {
      type: String,
      trim: true,
    },

    whatToRemember: {
      type: String,
      trim: true,
    },

    // Code snippet
    language: {
      type: String,
      trim: true,
    },

    code: {
      type: String,
    },

    // Person
    name: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    company: {
      type: String,
      trim: true,
    },

    role: {
      type: String,
      trim: true,
    },

        // Common metadata
    tags: {
      type: [String],
      default: [],
    },

    // Free-text notes — available on every type, separate from each
    // type's main content (e.g. a Password's notes vs. its password).
    notes: {
      type: String,
      trim: true,
      maxlength: 5000,
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Dynamic key/value fields (see fieldSchema above).
    fields: { type: [fieldSchema], default: [] },

    // 0 = legacy item (username/password/secret/envContent/dbConnectionUri
    // columns), 2 = item saved through the new editors (uses `fields`).
    fieldsVersion: { type: Number, default: 0 },

    // People only: "myself" (one special profile), "family" or "other".
    personGroup: {
      type: String,
      enum: ["myself", "family", "other"],
      default: undefined,
    },

    isStarred: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    deletedAt: { type: Date },

    // Reserved for encrypted documents in a later version. Nothing reads
    // or writes this yet; it only exists so adding file storage later
    // doesn't need a schema rewrite.
    attachments: {
      type: [
        {
          _id: false,
          name: { type: String, trim: true, maxlength: 255 },
          mimeType: { type: String, maxlength: 100 },
          size: { type: Number },
          storageRef: { type: String },
          metaEncrypted: { type: String },
        },
      ],
      default: [],
    },

    isDeleted: {
    type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

vaultItemSchema.index({ userId: 1, isDeleted: 1 });

module.exports = mongoose.model("VaultItem", vaultItemSchema);