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

const createVaultItemValidator = [
  body("type")
    .isString()
    .withMessage("Type must be a string")
    .isIn(VALID_TYPES)
    .withMessage("Invalid vault item type"),

  body("sensitive").custom((value, { req }) => {
  if (req.body.type === "note" && value === undefined) {
    throw new Error(
      "Specify whether this note requires your master password..."
    );
  }

  if (
    value !== undefined &&
    typeof value !== "boolean"
  ) {
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

  body("username")
    .optional()
    .isString()
    .withMessage("Username must be a string"),

  body("password")
    .optional()
    .isString()
    .withMessage("Password must be a string"),

  body("secret")
    .optional()
    .isString()
    .withMessage("Secret must be a string"),

  body("envContent")
    .optional()
    .isString()
    .withMessage("Environment content must be a string"),

  body("dbConnectionUri")
    .optional()
    .isString()
    .withMessage("Database connection URI must be a string"),

  body("dbName")
    .optional()
    .isString()
    .withMessage("Database name must be a string"),

  body("dbHost")
    .optional()
    .isString()
    .withMessage("Database host must be a string"),

  body("noteContent")
    .optional()
    .isString()
    .withMessage("Note content must be a string"),

  body("url")
    .optional()
    .isURL()
    .withMessage("URL must be valid"),

  body("whySaved")
    .optional()
    .isString()
    .withMessage("whySaved must be a string"),

  body("whatToRemember")
    .optional()
    .isString()
    .withMessage("whatToRemember must be a string"),

  body("language")
    .optional()
    .isString()
    .withMessage("Language must be a string"),

  body("code")
    .optional()
    .isString()
    .withMessage("Code must be a string"),

  body("name")
    .optional()
    .isString()
    .withMessage("Name must be a string"),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Email must be valid"),

  body("phone")
    .optional()
    .isString()
    .withMessage("Phone must be a string"),

  body("company")
    .optional()
    .isString()
    .withMessage("Company must be a string"),

  body("role")
    .optional()
    .isString()
    .withMessage("Role must be a string"),

  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array"),

  body("tags.*")
    .optional()
    .isString()
    .withMessage("Each tag must be a string"),

  body("data")
    .optional()
    .isObject()
    .withMessage("Data must be an object"),
];

const itemIdValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid vault item ID"),
];

module.exports = {
  VALID_TYPES,
  createVaultItemValidator,
  itemIdValidator,
};