import { Router } from "express";
import * as mlClient from "../services/mlServiceClient.js";
import AnalysisQuery from "../models/AnalysisQuery.js";

const router = Router();

router.post("/combined", async (req, res) => {
  const { forecastFeatures, anomalyFeatures } = req.body;
  if (!forecastFeatures || !anomalyFeatures) {
    return res.status(400).json({ error: "forecastFeatures and anomalyFeatures are both required" });
  }

  let result;
  try {
    result = await mlClient.getCombined(forecastFeatures, anomalyFeatures);
  } catch (err) {
    return res.status(502).json({ error: "ML service unavailable", detail: err.message });
  }

  // DB logging is a secondary audit trail, not the core value -- respond with
  // the real prediction immediately, and log in the background. A MongoDB
  // outage must never discard a successfully computed ML result.
  AnalysisQuery.create({
    forecastFeatures,
    anomalyFeatures,
    result: {
      forecastedTotalPowerKwh: result.forecasted_total_power_kwh,
      anomalyStatus: result.anomaly_status,
      anomalyProbability: result.anomaly_probability,
    },
  }).catch((err) => console.error("Failed to log analysis query:", err.message));

  res.json(result);
});

router.get("/history", async (req, res) => {
  try {
    const queries = await AnalysisQuery.find().sort({ createdAt: -1 }).limit(50);
    res.json(queries);
  } catch (err) {
    res.status(503).json({ error: "History unavailable (database issue)", detail: err.message });
  }
});

export default router;
