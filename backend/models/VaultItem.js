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
        "secure_note",
        "card",
        "identity",
        "document",
      ],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    usernameEncrypted: {
      type: String,
      select: false,
    },

    passwordEncrypted: {
      type: String,
      select: false,
    },

    secretEncrypted: {
      type: String,
      select: false,
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