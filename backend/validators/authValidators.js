const { z } = require("zod");

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters.")
    .max(128),
  masterPassword: z
    .string()
    .min(10, "Master password must be at least 10 characters.")
    .max(128),
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

const unlockVaultSchema = z.object({
  masterPassword: z.string().min(1).max(128),
});

module.exports = { registerSchema, loginSchema, unlockVaultSchema };
