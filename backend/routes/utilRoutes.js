const express = require("express");

const requireAuth = require("../middleware/requireAuth");

const {
  generatePassword,
} = require("../controllers/utilController");

const router = express.Router();

// Password generation requires account authentication,
// but does NOT require the vault to be unlocked.
router.use(requireAuth);

// GET /api/utils/generate-password
router.get("/generate-password", generatePassword);

module.exports = router;