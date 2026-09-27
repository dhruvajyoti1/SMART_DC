import axios from "axios";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

const client = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: 10000,
});

export async function getForecast(forecastFeatures) {
  const { data } = await client.post("/predict/forecast", forecastFeatures);
  return data;
}

export async function getAnomaly(anomalyFeatures) {
  const { data } = await client.post("/predict/anomaly", anomalyFeatures);
  return data;
}

export async function getCombined(forecastFeatures, anomalyFeatures) {
  const { data } = await client.post("/predict/combined", {
    forecast_features: forecastFeatures,
    anomaly_features: anomalyFeatures,
  });
  return data;
}

export async function getSimulationTick() {
  const { data } = await client.get("/simulation/tick");
  return data;
}

export async function resetSimulation() {
  const { data } = await client.post("/simulation/reset");
  return data;
}

export async function getSimulationStatus() {
  const { data } = await client.get("/simulation/status");
  return data;
}

export async function getForecastAnalytics() {
  const { data } = await client.get("/analytics/forecast");
  return data;
}

export async function getAnomalyAnalytics() {
  const { data } = await client.get("/analytics/anomaly");
  return data;
}
