/**
 * Server entry point — connects the database and starts listening.
 * This file is the ONLY place app.listen() is called.
 *
 * Run with:
 *   node src/server.js          (production)
 *   node --watch src/server.js  (development, Node ≥18.11)
 */
import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { connectDB } from "./config/db.js";
import logger from "./config/logger.js";

const PORT = process.env.PORT || 4000;

// DB connection attempted but NOT blocking server startup -- ML prediction
// routes should keep working even if MongoDB is temporarily unavailable,
// since DB writes there are logging/audit trail, not the core value.
connectDB().catch((err) => {
  logger.error("MongoDB connection failed (server will still serve ML-proxy routes): %s", err.message);
});

app.listen(PORT, () => {
  logger.info(`SmartDC-Energy Express Server listening on port ${PORT}`);
});
