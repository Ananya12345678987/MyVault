const express = require("express");
const { register, login, logout, me } = require("../controllers/authController");
const requireAuth = require("../middleware/requireAuth");
const { authLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, me);

module.exports = router;
