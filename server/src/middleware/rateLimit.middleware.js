/**
 * Rate limiting middleware using express-rate-limit.
 *
 * Protects resource-heavy ML inference endpoints from being overwhelmed
 * by excessive requests (accidental polling loops, bot abuse, etc.).
 *
 * Two tiers:
 *   apiLimiter      — generous default for all /api routes (100 req / 15 min per IP)
 *   inferenceLimiter — stricter limit for ML inference routes (30 req / 15 min per IP)
 */
import rateLimit from "express-rate-limit";

/**
 * General API rate limiter.
 * Applied to all /api/* routes in app.js.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                 // limit each IP to 100 requests per window
  standardHeaders: true,    // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,     // Disable X-RateLimit-* headers
  message: {
    error: "Too many requests",
    detail: "Rate limit exceeded. Please try again later.",
  },
});

/**
 * Stricter limiter for ML inference endpoints.
 * Each ML prediction triggers a Python model inference which is CPU-intensive.
 * Applied per-route in the analysis and live route files.
 */
export const inferenceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                  // 30 inference requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Inference rate limit exceeded",
    detail: "ML model inference is resource-intensive. Please slow down requests.",
  },
});
