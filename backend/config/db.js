const mongoose = require("mongoose");

/**
 * Connects to MongoDB.
 * Kept in its own file (not app.js) so the connection lifecycle
 * (retry, logging, shutdown) is testable and swappable independent
 * of the Express app setup.
 */
async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not set in environment variables.");
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(uri);

  console.log(`[db] MongoDB connected: ${mongoose.connection.host}`);

  mongoose.connection.on("error", (err) => {
    console.error("[db] MongoDB connection error:", err.message);
  });
}

module.exports = connectDB;
