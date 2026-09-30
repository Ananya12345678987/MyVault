const { body, param } = require("express-validator");

const VALID_TYPES = [
  "password",
  "secret",
  "env",
  "dbCredential",
  "note",
  "resource",
  "snippet",
  "person",
];

// Types where the user must explicitly choose whether the item is
// protected. Kept as one shared list so create/update can't drift
// out of sync with each other or with itemRequiresUnlock() in the
// service layer.
// Every type requires the sensitivity choice now — no exceptions.
const FLEXIBLE_TYPES = VALID_TYPES;


const createVaultItemValidator = [
  body("type")
    .isString()
    .withMessage("Type must be a string")
    .isIn(VALID_TYPES)
    .withMessage("Invalid vault item type"),

  body("sensitive").custom((value, { req }) => {
    if (FLEXIBLE_TYPES.includes(req.body.type) && value === undefined) {
      throw new Error(
        "Specify whether this item requires your master password (true or false)."
      );
    }
    if (value !== undefined && typeof value !== "boolean") {
      throw new Error("Sensitive must be a boolean");
    }
    return true;
  }),

  body("title")
    .isString()
    .withMessage("Title must be a string")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 200 })
    .withMessage("Title cannot exceed 200 characters"),

  body("username").optional().isString().withMessage("Username must be a string"),
  body("password").optional().isString().withMessage("Password must be a string"),
  body("secret").optional().isString().withMessage("Secret must be a string"),
  body("envContent").optional().isString().withMessage("Environment content must be a string"),
  body("dbConnectionUri").optional().isString().withMessage("Database connection URI must be a string"),
  body("dbName").optional().isString().withMessage("Database name must be a string"),
  body("dbHost").optional().isString().withMessage("Database host must be a string"),
  body("noteContent").optional().isString().withMessage("Note content must be a string"),
  body("url").optional().isURL().withMessage("URL must be valid"),
  body("whySaved").optional().isString().withMessage("whySaved must be a string"),
  body("whatToRemember").optional().isString().withMessage("whatToRemember must be a string"),
  body("language").optional().isString().withMessage("Language must be a string"),
  body("code").optional().isString().withMessage("Code must be a string"),
  body("name").optional().isString().withMessage("Name must be a string"),
  body("email").optional().isEmail().withMessage("Email must be valid"),
  body("phone").optional().isString().withMessage("Phone must be a string"),
  body("company").optional().isString().withMessage("Company must be a string"),
  body("role").optional().isString().withMessage("Role must be a string"),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
  body("tags.*").optional().isString().withMessage("Each tag must be a string"),
  body("notes").optional().isString().isLength({ max: 5000 }).withMessage("Notes must be under 5000 characters"),
  body("data").optional().isObject().withMessage("Data must be an object"),
];

/**
 * For PUT (partial edits). Deliberately NOT the same array as create:
 *  - no `type` field at all — an item's type never changes after creation
 *  - `title` is optional, not required — editing tags shouldn't force
 *    you to resend the title
 *  - `sensitive` is optional here too — the service decides what's
 *    actually required (via itemRequiresUnlock, using the item's real
 *    stored type) once it loads the item; the validator's job is just
 *    "if you DID send it, it must be a boolean," not "you must send it"
 */
const updateVaultItemValidator = [
  body("sensitive").optional().isBoolean().withMessage("Sensitive must be a boolean"),
  body("title").optional().isString().trim().notEmpty().isLength({ max: 200 }).withMessage("Title must be a non-empty string up to 200 characters"),
  body("username").optional().isString().withMessage("Username must be a string"),
  body("password").optional().isString().withMessage("Password must be a string"),
  body("secret").optional().isString().withMessage("Secret must be a string"),
  body("envContent").optional().isString().withMessage("Environment content must be a string"),
  body("dbConnectionUri").optional().isString().withMessage("Database connection URI must be a string"),
  body("dbName").optional().isString().withMessage("Database name must be a string"),
  body("dbHost").optional().isString().withMessage("Database host must be a string"),
  body("noteContent").optional().isString().withMessage("Note content must be a string"),
  body("url").optional().isURL().withMessage("URL must be valid"),
  body("whySaved").optional().isString().withMessage("whySaved must be a string"),
  body("whatToRemember").optional().isString().withMessage("whatToRemember must be a string"),
  body("language").optional().isString().withMessage("Language must be a string"),
  body("code").optional().isString().withMessage("Code must be a string"),
  body("name").optional().isString().withMessage("Name must be a string"),
  body("email").optional().isEmail().withMessage("Email must be valid"),
  body("phone").optional().isString().withMessage("Phone must be a string"),
  body("company").optional().isString().withMessage("Company must be a string"),
  body("role").optional().isString().withMessage("Role must be a string"),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
  body("tags.*").optional().isString().withMessage("Each tag must be a string"),
  body("data").optional().isObject().withMessage("Data must be an object"),
];

const itemIdValidator = [
  param("id").isMongoId().withMessage("Invalid vault item ID"),
];

module.exports = {
  VALID_TYPES,
  FLEXIBLE_TYPES,
  createVaultItemValidator,
  updateVaultItemValidator,
  itemIdValidator,
};