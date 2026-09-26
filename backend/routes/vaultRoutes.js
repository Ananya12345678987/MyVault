const express = require("express");

const requireAuth = require("../middleware/requireAuth");

const {
  unlockVault,
  lockVault,
  vaultStatus,
  createItem,
  listItems,
  getItem,
  updateItem,
  deleteItem,
} = require("../controllers/vaultController");

const router = express.Router();

// Every vault route requires account authentication.
router.use(requireAuth);

// Vault lock/unlock
router.post("/unlock", unlockVault);
router.post("/lock", lockVault);
router.get("/status", vaultStatus);

// Vault items
router.post("/items", createItem);
router.get("/items", listItems);
router.get("/items/:id", getItem);
router.put("/items/:id", updateItem);
router.delete("/items/:id", deleteItem);

module.exports = router;