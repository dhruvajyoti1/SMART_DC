/**
 * Analytics Controller — serves pre-computed model diagnostics and
 * performance metrics from the ML service.
 *
 * Business logic extracted from analyticsRoutes.js.
 */
import * as mlClient from "../services/mlServiceClient.js";
import { AppError } from "../middleware/error.middleware.js";

/**
 * GET /api/analytics/forecast
 * Returns forecast model performance metrics (R², RMSE, MAE, etc.).
 */
export async function getForecastAnalytics(req, res, next) {
  try {
    res.json(await mlClient.getForecastAnalytics());
  } catch (err) {
    return next(new AppError("ML service unavailable", 502));
  }
}

/**
 * GET /api/analytics/anomaly
 * Returns anomaly detection model metrics (F1, precision, recall, etc.).
 */
export async function getAnomalyAnalytics(req, res, next) {
  try {
    res.json(await mlClient.getAnomalyAnalytics());
  } catch (err) {
    return next(new AppError("ML service unavailable", 502));
  }
}

/**
 * GET /api/analytics/summary
 * Returns both forecast and anomaly analytics in a single response.
 */
export async function getSummary(req, res, next) {
  try {
    const [forecast, anomaly] = await Promise.all([
      mlClient.getForecastAnalytics(),
      mlClient.getAnomalyAnalytics(),
    ]);
    res.json({ forecast, anomaly });
  } catch (err) {
    return next(new AppError("ML service unavailable", 502));
  }
}
