const {
  generatePassword: createPassword,
} = require("../utils/passwordGenerator");

async function generatePassword(req, res, next) {
  try {
    const length = req.query.length
      ? Number(req.query.length)
      : 16;

    const symbolsParam = req.query.symbols;

    let includeSymbols = true;

    if (symbolsParam !== undefined) {
      if (symbolsParam !== "true" && symbolsParam !== "false") {
        return res.status(400).json({
          error: "symbols must be true or false.",
        });
      }

      includeSymbols = symbolsParam === "true";
    }

    if (!Number.isInteger(length) || length < 8 || length > 128) {
      return res.status(400).json({
        error: "Length must be between 8 and 128.",
      });
    }

    const password = createPassword(length, includeSymbols);

    return res.json({
      password,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  generatePassword,
};