/**
 * Live telemetry routes — thin URL-to-controller mappings.
 * All business logic lives in controllers/live.controller.js.
 */
import { Router } from "express";
import * as liveController from "../controllers/live.controller.js";

const router = Router();

router.get("/tick",    liveController.getTick);
router.post("/reset",  liveController.resetSimulation);
router.get("/status",  liveController.getStatus);
router.get("/history", liveController.getHistory);

export default router;
