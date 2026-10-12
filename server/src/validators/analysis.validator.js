/**
 * Request validation middleware for the analysis/combined endpoint.
 *
 * Validates that incoming telemetry payloads contain the expected shape
 * BEFORE they are forwarded to the Python ML service. This prevents
 * malformed inputs from reaching the model and producing cryptic errors.
 *
 * Since this project doesn't use TypeScript or Zod/Joi, we use a
 * lightweight hand-rolled validator that is sufficient for the payload
 * shapes in SmartDC-Energy.
 */
import { AppError } from "../middleware/error.middleware.js";

/**
 * Validates the POST /api/analysis/combined request body.
 *
 * Expected shape:
 * {
 *   forecastFeatures: { <numeric key-value pairs> },
 *   anomalyFeatures: { <numeric key-value pairs> }
 * }
 */
export function validateCombinedBody(req, _res, next) {
  const { forecastFeatures, anomalyFeatures } = req.body;

  if (!forecastFeatures || typeof forecastFeatures !== "object" || Array.isArray(forecastFeatures)) {
    return next(new AppError("forecastFeatures must be a non-null object with numeric feature values", 400));
  }

  if (!anomalyFeatures || typeof anomalyFeatures !== "object" || Array.isArray(anomalyFeatures)) {
    return next(new AppError("anomalyFeatures must be a non-null object with numeric feature values", 400));
  }

  // Verify that feature values are numbers (not strings, booleans, nested objects)
  for (const [key, val] of Object.entries(forecastFeatures)) {
    if (typeof val !== "number" || !isFinite(val)) {
      return next(new AppError(`forecastFeatures.${key} must be a finite number, got ${typeof val}`, 400));
    }
  }

  for (const [key, val] of Object.entries(anomalyFeatures)) {
    if (typeof val !== "number" || !isFinite(val)) {
      return next(new AppError(`anomalyFeatures.${key} must be a finite number, got ${typeof val}`, 400));
    }
  }

  next();
}

/**
 * Validates simulation what-if scenario request body.
 *
 * Expected shape:
 * {
 *   forecastOverrides: { <optional numeric overrides> },
 *   anomalyOverrides: { <optional numeric overrides> }
 * }
 */
export function validateSimulationBody(req, _res, next) {
  const { forecastOverrides, anomalyOverrides } = req.body;

  // Overrides are optional — but if present, they must be objects with numeric values
  if (forecastOverrides !== undefined) {
    if (typeof forecastOverrides !== "object" || Array.isArray(forecastOverrides)) {
      return next(new AppError("forecastOverrides must be an object with numeric values", 400));
    }
    for (const [key, val] of Object.entries(forecastOverrides)) {
      if (typeof val !== "number" || !isFinite(val)) {
        return next(new AppError(`forecastOverrides.${key} must be a finite number`, 400));
      }
    }
  }

  if (anomalyOverrides !== undefined) {
    if (typeof anomalyOverrides !== "object" || Array.isArray(anomalyOverrides)) {
      return next(new AppError("anomalyOverrides must be an object with numeric values", 400));
    }
    for (const [key, val] of Object.entries(anomalyOverrides)) {
      if (typeof val !== "number" || !isFinite(val)) {
        return next(new AppError(`anomalyOverrides.${key} must be a finite number`, 400));
      }
    }
  }

  next();
}
