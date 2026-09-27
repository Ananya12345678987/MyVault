const mongoose = require("mongoose");

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
    sensitive: {
      type: Boolean,
      required: function () {
        return ["note", "resource", "snippet", "person"].includes(this.type);
      },
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

    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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