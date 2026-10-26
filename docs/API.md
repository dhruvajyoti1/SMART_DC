# 📡 API Reference — SmartDC-Energy

This document provides a complete reference for all HTTP endpoints exposed by the **Express Gateway** (Port 4000) and the **FastAPI ML Microservice** (Port 8000).

---

## 🏛️ Routing Architecture

The client interacts directly with the **Express API Gateway** on port 4000 (via Vite proxy or Nginx). The gateway performs request validation, rate limiting, and forwards ML inference calls to the internal **FastAPI ML Microservice** on port 8000 via HTTP (`axios`). Audit events are persisted asynchronously to MongoDB.

---

## ⚙️ Express Gateway Endpoints (Port 4000)

Base URL: `http://localhost:4000`

| Method | Endpoint | Description | Request Body / Parameters | Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | Health check | None | `{"status": "ok", "service": "SmartDC-Energy Express Server"}` |
| `GET` | `/api/live/tick` | Advance chronological simulation replay by 1 tick; returns telemetry, ML forecast, and anomaly risk. Automatically logs event to MongoDB. | None | JSON object with telemetry measurements, PUE, forecast power, and anomaly probability. |
| `POST` | `/api/live/reset` | Reset simulation replay engine back to tick 0. | None | `{"status": "reset", "position": 0}` |
| `GET` | `/api/live/status` | Current replay position, total ticks, and exhaustion status. | None | `{"position": 21, "total_ticks": 1122, "is_exhausted": false}` |
| `GET` | `/api/live/history` | Retrieve the last 50 replayed telemetry events from MongoDB `SimulationLog`. | Query: `?limit=50` (optional) | Array of simulation log documents. |
| `POST` | `/api/analysis/combined` | What-If dispatch simulation: runs combined energy forecast and anomaly detection on user-defined feature inputs. Audited to MongoDB. | JSON: `forecastFeatures` (25 fields) and `anomalyFeatures` (15 fields). | JSON: `forecasted_total_power_kwh`, `anomaly_status`, `anomaly_probability`. |
| `GET` | `/api/analysis/history` | Retrieve the last 50 what-if simulation queries from MongoDB `AnalysisQuery`. | None | Array of analysis query documents. |
| `GET` | `/api/analytics/forecast` | Retrieve benchmark comparison metrics for forecasting models (XGBoost, LightGBM, LSTM). | None | JSON: metrics list, feature importances, train-test gap. |
| `GET` | `/api/analytics/anomaly` | Retrieve benchmark metrics for anomaly detection models (Random Forest, Isolation Forest). | None | JSON: precision, recall, F1, ROC-AUC, confusion matrix. |
| `GET` | `/api/analytics/summary` | Merged summary of forecast and anomaly analytics. | None | JSON combining forecast and anomaly model results. |

---

## 🧠 FastAPI ML Microservice Endpoints (Port 8000)

Base URL: `http://localhost:8000`  
Interactive Swagger Docs: [http://localhost:8000/docs](http://localhost:8000/docs)  
OpenAPI JSON Schema: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

| Method | Endpoint | Router | Description | Request / Response Schema |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | `main` | Health check | `{"status": "ok", "service": "SmartDC-Energy ML Service"}` |
| `POST` | `/predict/forecast` | `forecast` | Generates XGBoost electricity demand forecast (kWh). | Request: `ForecastFeatures` (25 numeric fields)<br>Response: `ForecastResponse` |
| `POST` | `/predict/anomaly` | `anomaly` | Classifies operational state (`normal` vs `failure`) with Random Forest. | Request: `AnomalyFeatures` (15 numeric fields)<br>Response: `AnomalyResponse` |
| `POST` | `/predict/combined` | `combined` | Generates both forecast and anomaly prediction in a single request. | Request: `CombinedRequest`<br>Response: `CombinedResponse` |
| `GET` | `/simulation/tick` | `simulation` | Advances test-split chronological replay engine by 1 step. | Response: `SimulationTickResponse` |
| `POST` | `/simulation/reset` | `simulation` | Resets replay stream to position 0. | Response: `{"status": "reset", "position": 0}` |
| `GET` | `/simulation/status` | `simulation` | Returns replay cursor position and total ticks. | Response: `SimulationStatus` |
| `GET` | `/analytics/forecast` | `analytics` | Serves metrics from `ml-pipeline/results/forecast_results.json`. | Response: `ForecastAnalytics` |
| `GET` | `/analytics/anomaly` | `analytics` | Serves metrics from `ml-pipeline/results/anomaly_results.json`. | Response: `AnomalyAnalytics` |
| `GET` | `/analytics/summary` | `analytics` | Aggregated model benchmark summary. | Response: `AnalyticsSummary` |

---

## 💡 Example: What-If Combined Inference

### Request

**cURL (Linux / macOS / Git Bash):**

```bash
curl -X POST http://localhost:4000/api/analysis/combined \
  -H "Content-Type: application/json" \
  -d '{
    "forecastFeatures": {
      "ambient_temp_c": 22.5, "relative_humidity_pct": 45.0, "chilled_water_temp_c": 12.0,
      "server_inlet_temp_c": 24.0, "under_floor_pressure_pa": 12.5, "hour": 12,
      "day_of_week": 2, "month": 6, "is_weekend": 0, "hour_sin": 0.0, "hour_cos": -1.0,
      "month_sin": 0.0, "month_cos": -1.0, "weekend_energy_kwh": 0, "midnight_energy_kwh": 9600,
      "lag_1h": 9650, "lag_6h": 9500, "lag_12h": 9400, "lag_24h": 9600, "lag_48h": 9550,
      "lag_168h": 9700, "roll_mean_6h": 9600, "roll_std_6h": 120, "roll_mean_24h": 9550, "roll_std_24h": 150
    },
    "anomalyFeatures": {
      "ambient_temp_c": 22.5, "relative_humidity_pct": 45.0, "chilled_water_temp_c": 12.0,
      "server_inlet_temp_c": 24.0, "under_floor_pressure_pa": 12.5, "it_load_kwh": 8500,
      "cooling_load_kwh": 1200, "support_load_kwh": 50, "total_power_kwh": 9750,
      "pue": 1.15, "hour_sin": 0.0, "hour_cos": -1.0, "month_sin": 0.0, "month_cos": -1.0, "is_weekend": 0
    }
  }'
```

**PowerShell (Windows):**

```powershell
$body = @{
  forecastFeatures = @{
    ambient_temp_c = 22.5; relative_humidity_pct = 45.0; chilled_water_temp_c = 12.0;
    server_inlet_temp_c = 24.0; under_floor_pressure_pa = 12.5; hour = 12;
    day_of_week = 2; month = 6; is_weekend = 0; hour_sin = 0.0; hour_cos = -1.0;
    month_sin = 0.0; month_cos = -1.0; weekend_energy_kwh = 0; midnight_energy_kwh = 9600;
    lag_1h = 9650; lag_6h = 9500; lag_12h = 9400; lag_24h = 9600; lag_48h = 9550;
    lag_168h = 9700; roll_mean_6h = 9600; roll_std_6h = 120; roll_mean_24h = 9550; roll_std_24h = 150
  };
  anomalyFeatures = @{
    ambient_temp_c = 22.5; relative_humidity_pct = 45.0; chilled_water_temp_c = 12.0;
    server_inlet_temp_c = 24.0; under_floor_pressure_pa = 12.5; it_load_kwh = 8500;
    cooling_load_kwh = 1200; support_load_kwh = 50; total_power_kwh = 9750;
    pue = 1.15; hour_sin = 0.0; hour_cos = -1.0; month_sin = 0.0; month_cos = -1.0; is_weekend = 0
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "http://localhost:4000/api/analysis/combined" -Method Post -ContentType "application/json" -Body $body
```

### Response (`200 OK`)

```json
{
  "forecasted_total_power_kwh": 9777.35,
  "anomaly_status": "normal",
  "anomaly_probability": 0.106,
  "note": "Simulated/replayed data — not live telemetry from a real facility."
}
```

---

## 🛑 Common Error Status Codes

| HTTP Status | Error Name | Meaning / Cause |
| :--- | :--- | :--- |
| `400 Bad Request` | Validation Error | Request body is missing required feature fields or values are non-numeric (`analysis.validator.js`). |
| `404 Not Found` | Unknown Route | The requested endpoint does not exist on the gateway. |
| `422 Unprocessable Entity` | Pydantic Validation | Payload sent to FastAPI does not match `ForecastFeatures` or `AnomalyFeatures` schema. |
| `429 Too Many Requests` | Rate Limit Exceeded | Client exceeded 100 requests / 15 min on `/api` or 30 requests / 15 min on `/api/analysis/combined`. |
| `502 Bad Gateway` | ML Service Unavailable | Express cannot connect to FastAPI on `http://localhost:8000` (FastAPI is not running or crashed). |
| `503 Service Unavailable` | Database Issue | MongoDB query or connection failed during request processing. |
