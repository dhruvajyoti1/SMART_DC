/**
 * Analysis routes — thin URL-to-controller mappings.
 * Request validation is handled by validator middleware.
 * All business logic lives in controllers/analysis.controller.js.
 */
import { Router } from "express";
import * as analysisController from "../controllers/analysis.controller.js";
import { validateCombinedBody } from "../validators/analysis.validator.js";
import { inferenceLimiter } from "../middleware/rateLimit.middleware.js";

const router = Router();

// POST /api/analysis/combined — ML inference (validate + rate-limit before controller)
router.post("/combined", inferenceLimiter, validateCombinedBody, analysisController.getCombined);

// GET /api/analysis/history — audit trail
router.get("/history", analysisController.getHistory);

export default router;
