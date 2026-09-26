const express = require("express");

const requireAuth = require("../middleware/requireAuth");

const {
  getSettings,
  updateSettings,
} = require("../controllers/settingsController");

const {
  validateSettingsUpdate,
} = require("../validators/settingsValidators");

const router = express.Router();

// Every settings route requires account authentication.
// Vault unlock is NOT required.
router.use(requireAuth);

// GET /api/settings
router.get("/", getSettings);

// PUT /api/settings
router.put("/", validateSettingsUpdate, updateSettings);

module.exports = router;