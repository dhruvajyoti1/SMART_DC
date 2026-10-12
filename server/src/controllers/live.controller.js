/**
 * Live Telemetry Controller — handles real-time simulation tick,
 * reset, status, and history operations.
 *
 * Business logic extracted from liveRoutes.js so that routes remain
 * thin URL-to-handler mappings and controllers are independently testable.
 */
import * as mlClient from "../services/mlServiceClient.js";
import SimulationLog from "../models/SimulationLog.js";
import { AppError } from "../middleware/error.middleware.js";
import logger from "../config/logger.js";

/**
 * GET /api/live/tick
 * Fetches the next simulation data point from the ML service,
 * logs it to MongoDB (fire-and-forget), and returns the result.
 */
export async function getTick(req, res, next) {
  try {
    const result = await mlClient.getSimulationTick();

    // Log to MongoDB for the dashboard's history view — fire-and-forget,
    // don't block the response on a DB write
    SimulationLog.create({
      timestamp: new Date(result.timestamp),
      forecastedTotalPowerKwh: result.forecasted_total_power_kwh,
      anomalyStatus: result.anomaly_status,
      anomalyProbability: result.anomaly_probability,
      position: result.position,
    }).catch((err) => logger.warn("Failed to log simulation tick: %s", err.message));

    res.json(result);
  } catch (err) {
    if (err.response?.status === 410) {
      return next(new AppError("Simulation exhausted — all test data points have been replayed", 410));
    }
    return next(new AppError("ML service unavailable", 502));
  }
}

/**
 * POST /api/live/reset
 * Resets the simulation cursor back to the beginning.
 */
export async function resetSimulation(req, res, next) {
  try {
    const result = await mlClient.resetSimulation();
    res.json(result);
  } catch (err) {
    return next(new AppError("ML service unavailable", 502));
  }
}

/**
 * GET /api/live/status
 * Returns the current simulation state (position, total rows, etc.).
 */
export async function getStatus(req, res, next) {
  try {
    const result = await mlClient.getSimulationStatus();
    res.json(result);
  } catch (err) {
    return next(new AppError("ML service unavailable", 502));
  }
}

/**
 * GET /api/live/history
 * Returns the last 100 simulation ticks logged to MongoDB.
 */
export async function getHistory(req, res, next) {
  try {
    const logs = await SimulationLog.find().sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    return next(new AppError("History unavailable (database issue)", 503));
  }
}
