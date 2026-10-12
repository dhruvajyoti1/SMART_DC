/**
 * Express application factory — creates and configures the Express app
 * WITHOUT starting a listener. This separation lets integration tests
 * import the app (via supertest) without binding to a real port.
 *
 * server.js is the only file that calls app.listen().
 */
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { apiLimiter } from "./middleware/rateLimit.middleware.js";
import liveRoutes from "./routes/liveRoutes.js";
import analysisRoutes from "./routes/analysisRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import logger from "./config/logger.js";

const app = express();

// --------------- Global Middleware ---------------

// Security headers (XSS, clickjacking, MIME-sniffing, etc.)
app.use(helmet());

// CORS — configurable via environment variable, defaults to local dev origins
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || [
      "http://localhost:5173",
      "http://localhost:3000",
    ],
  })
);

// JSON body parsing with a reasonable size limit
app.use(express.json({ limit: "1mb" }));

// Rate limiting on all /api routes to protect ML inference from abuse
app.use("/api", apiLimiter);

// --------------- Routes ---------------

// Health check — used by Docker healthchecks and load balancers
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "SmartDC-Energy Express Server" });
});

app.use("/api/live", liveRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/analytics", analyticsRoutes);

// --------------- Error Handling ---------------

// Catch-all for unmatched routes — must be after all route registrations
app.use(notFoundHandler);

// Centralised error handler — must be the very last middleware
app.use(errorHandler);

export default app;
