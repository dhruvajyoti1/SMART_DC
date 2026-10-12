/**
 * Analytics routes — thin URL-to-controller mappings.
 * All business logic lives in controllers/analytics.controller.js.
 */
import { Router } from "express";
import * as analyticsController from "../controllers/analytics.controller.js";

const router = Router();

router.get("/forecast", analyticsController.getForecastAnalytics);
router.get("/anomaly",  analyticsController.getAnomalyAnalytics);
router.get("/summary",  analyticsController.getSummary);

export default router;
