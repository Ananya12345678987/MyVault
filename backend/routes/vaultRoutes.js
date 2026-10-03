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
  setStarred,
  setArchived,
  restoreItem,
  permanentlyDeleteItem,
  emptyTrashItems,
} = require("../controllers/vaultController");

const {
  createVaultItemValidator,
  updateVaultItemValidator,
  itemIdValidator,
  flagValueValidator,
} = require("../validators/vaultItemValidators");

const router = express.Router();

// Every vault route requires account authentication.
router.use(requireAuth);

// Vault lock/unlock
router.post("/unlock", unlockVault);
router.post("/lock", lockVault);
router.get("/status", vaultStatus);

// Vault items
router.post("/items", createVaultItemValidator, validate, createItem);

router.get("/items", listItems);

router.get("/items/:id", itemIdValidator, validate, getItem);

router.put(
  "/items/:id",
  itemIdValidator,
  validate,
  updateVaultItemValidator,
  validate,
  updateItem
);

router.delete("/items/:id", itemIdValidator, validate, deleteItem);

// Star / archive / trash lifecycle
router.patch("/items/:id/star", itemIdValidator, flagValueValidator, validate, setStarred);
router.patch("/items/:id/archive", itemIdValidator, flagValueValidator, validate, setArchived);
router.patch("/items/:id/restore", itemIdValidator, validate, restoreItem);
router.delete("/items/:id/permanent", itemIdValidator, validate, permanentlyDeleteItem);
router.delete("/trash", emptyTrashItems);

module.exports = router;