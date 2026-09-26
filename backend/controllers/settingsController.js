const User = require("../models/User");

// GET /api/settings
// Returns the logged-in user's security settings.
async function getSettings(req, res, next) {
  try {
    const user = await User.findById(req.userId).select("settings");

    if (!user) {
      return res.status(404).json({
        error: "User not found.",
      });
    }

    return res.json({
      settings: {
        autoLockMinutes: user.settings.autoLockMinutes,
        clipboardClearSeconds: user.settings.clipboardClearSeconds,
      },
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/settings
// Updates one or both security settings.
async function updateSettings(req, res, next) {
  try {
    const { autoLockMinutes, clipboardClearSeconds } = req.body;

    const user = await User.findById(req.userId).select("settings");

    if (!user) {
      return res.status(404).json({
        error: "User not found.",
      });
    }

    if (autoLockMinutes !== undefined) {
      user.settings.autoLockMinutes = autoLockMinutes;
    }

    if (clipboardClearSeconds !== undefined) {
      user.settings.clipboardClearSeconds = clipboardClearSeconds;
    }

    await user.save();

    return res.json({
      settings: {
        autoLockMinutes: user.settings.autoLockMinutes,
        clipboardClearSeconds: user.settings.clipboardClearSeconds,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSettings,
  updateSettings,
};