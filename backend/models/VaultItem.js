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
sensitive: {
  type: Boolean,
  required: function () {
    return this.type === "note";
  },
},

noteContent: {
  type: String,
  select: false,
},

noteContentEncrypted: {
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