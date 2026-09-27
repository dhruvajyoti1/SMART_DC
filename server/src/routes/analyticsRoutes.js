import { Router } from "express";
import * as mlClient from "../services/mlServiceClient.js";

const router = Router();

router.get("/forecast", async (req, res) => {
  try {
    res.json(await mlClient.getForecastAnalytics());
  } catch (err) {
    res.status(502).json({ error: "ML service unavailable", detail: err.message });
  }
});

router.get("/anomaly", async (req, res) => {
  try {
    res.json(await mlClient.getAnomalyAnalytics());
  } catch (err) {
    res.status(502).json({ error: "ML service unavailable", detail: err.message });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const [forecast, anomaly] = await Promise.all([
      mlClient.getForecastAnalytics(),
      mlClient.getAnomalyAnalytics(),
    ]);
    res.json({ forecast, anomaly });
  } catch (err) {
    res.status(502).json({ error: "ML service unavailable", detail: err.message });
  }
});

export default router;
