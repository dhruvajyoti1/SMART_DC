import { Router } from "express";
import * as mlClient from "../services/mlServiceClient.js";
import SimulationLog from "../models/SimulationLog.js";

const router = Router();

router.get("/tick", async (req, res) => {
  try {
    const result = await mlClient.getSimulationTick();
    // Log to MongoDB for the dashboard's history view -- fire-and-forget,
    // don't block the response on a DB write
    SimulationLog.create({
      timestamp: new Date(result.timestamp),
      forecastedTotalPowerKwh: result.forecasted_total_power_kwh,
      anomalyStatus: result.anomaly_status,
      anomalyProbability: result.anomaly_probability,
      position: result.position,
    }).catch((err) => console.error("Failed to log simulation tick:", err.message));

    res.json(result);
  } catch (err) {
    if (err.response?.status === 410) {
      return res.status(410).json({ error: "Simulation exhausted", detail: err.response.data });
    }
    res.status(502).json({ error: "ML service unavailable", detail: err.message });
  }
});

router.post("/reset", async (req, res) => {
  try {
    const result = await mlClient.resetSimulation();
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: "ML service unavailable", detail: err.message });
  }
});

router.get("/status", async (req, res) => {
  try {
    const result = await mlClient.getSimulationStatus();
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: "ML service unavailable", detail: err.message });
  }
});

router.get("/history", async (req, res) => {
  try {
    const logs = await SimulationLog.find().sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(503).json({ error: "History unavailable (database issue)", detail: err.message });
  }
});

export default router;
