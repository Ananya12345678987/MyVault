const ALLOWED_AUTO_LOCK_MINUTES = [5, 10, 15, 30, 60];

const ALLOWED_CLIPBOARD_CLEAR_SECONDS = [15, 30, 60, 120, 300];

function validateSettingsUpdate(req, res, next) {
  const { autoLockMinutes, clipboardClearSeconds } = req.body;

  if (autoLockMinutes !== undefined) {
    if (
      !Number.isInteger(autoLockMinutes) ||
      !ALLOWED_AUTO_LOCK_MINUTES.includes(autoLockMinutes)
    ) {
      return res.status(400).json({
        error: `autoLockMinutes must be one of: ${ALLOWED_AUTO_LOCK_MINUTES.join(
          ", "
        )}`,
      });
    }
  }

  if (clipboardClearSeconds !== undefined) {
    if (
      !Number.isInteger(clipboardClearSeconds) ||
      !ALLOWED_CLIPBOARD_CLEAR_SECONDS.includes(clipboardClearSeconds)
    ) {
      return res.status(400).json({
        error: `clipboardClearSeconds must be one of: ${ALLOWED_CLIPBOARD_CLEAR_SECONDS.join(
          ", "
        )}`,
      });
    }
  }

  next();
}

module.exports = {
  ALLOWED_AUTO_LOCK_MINUTES,
  ALLOWED_CLIPBOARD_CLEAR_SECONDS,
  validateSettingsUpdate,
};