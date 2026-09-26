const express = require("express");

const requireAuth = require("../middleware/requireAuth");

const validate = require("../middleware/validate");

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

const {
  createVaultItemValidator,
  itemIdValidator,
} = require("../validators/vaultItemValidators");

const router = express.Router();

// Every vault route requires account authentication.
router.use(requireAuth);

// Vault lock/unlock
router.post("/unlock", unlockVault);

router.post("/lock", lockVault);

router.get("/status", vaultStatus);

// Vault items
router.post(
  "/items",
  createVaultItemValidator,
  validate,
  createItem
);

router.get("/items", listItems);

router.get(
  "/items/:id",
  itemIdValidator,
  validate,
  getItem
);

router.put(
  "/items/:id",
  itemIdValidator,
  validate,
  createVaultItemValidator,
  validate,
  updateItem
);

router.delete(
  "/items/:id",
  itemIdValidator,
  validate,
  deleteItem
);

module.exports = router;