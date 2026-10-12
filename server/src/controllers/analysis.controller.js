/**
 * Analysis Controller — handles combined ML inference requests
 * (forecast + anomaly detection in a single call) and query history.
 *
 * Business logic extracted from analysisRoutes.js.
 */
import * as mlClient from "../services/mlServiceClient.js";
import AnalysisQuery from "../models/AnalysisQuery.js";
import { AppError } from "../middleware/error.middleware.js";
import logger from "../config/logger.js";

/**
 * POST /api/analysis/combined
 * Runs combined forecast + anomaly detection on the provided feature set.
 * Logs the query to MongoDB as an audit trail (fire-and-forget).
 *
 * Request body validation is handled by the validateCombinedBody middleware
 * before this controller is reached.
 */
export async function getCombined(req, res, next) {
  const { forecastFeatures, anomalyFeatures } = req.body;

  let result;
  try {
    result = await mlClient.getCombined(forecastFeatures, anomalyFeatures);
  } catch (err) {
    return next(new AppError("ML service unavailable", 502));
  }

  // DB logging is a secondary audit trail, not the core value — respond with
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
  }).catch((err) => logger.warn("Failed to log analysis query: %s", err.message));

  res.json(result);
}

/**
 * GET /api/analysis/history
 * Returns the most recent 50 analysis queries from MongoDB.
 */
export async function getHistory(req, res, next) {
  try {
    const queries = await AnalysisQuery.find().sort({ createdAt: -1 }).limit(50);
    res.json(queries);
  } catch (err) {
    return next(new AppError("History unavailable (database issue)", 503));
  }
}
