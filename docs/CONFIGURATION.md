# ⚙️ Configuration Reference — SmartDC-Energy

This document details all configuration options, environment variables, and rate-limiting policies for the SmartDC-Energy platform.

---

## 📋 Environment Variables

### Server Configuration (`server/.env`)

Copy `server/.env.example` to `server/.env` and update the values as needed:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `4000` | Port on which the Express API gateway listens. |
| `MONGODB_URI` | `mongodb://localhost:27017/smartdc-energy` | Connection string for MongoDB (local instance or MongoDB Atlas). |
| `ML_SERVICE_URL` | `http://localhost:8000` | Base URL of the FastAPI machine learning inference microservice. |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origins for the frontend client (comma-separated for multiple origins). |

### Client Configuration (`client/.env`)

Copy `client/.env.example` to `client/.env`:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `http://localhost:4000` | Backend API base URL. In local development, the Vite dev proxy automatically forwards `/api` requests to `http://localhost:4000`, eliminating CORS issues. |

### Docker Compose Overrides (`docker-compose.yml`)

When running with Docker, services communicate over the internal Docker network. The compose configuration injects:

| Container | Variable | Container Value | Description |
| :--- | :--- | :--- | :--- |
| `server` | `PORT` | `4000` | Express internal port. |
| `server` | `MONGODB_URI` | `mongodb://mongodb:27017/smartdc-energy` | Uses the `mongodb` service DNS name. |
| `server` | `ML_SERVICE_URL` | `http://ml-service:8000` | Uses the `ml-service` container DNS name. |
| `server` | `CORS_ORIGIN` | `http://localhost:5173,http://localhost:80` | Allows requests from Vite dev server and Nginx. |
| `ml-service` | `MODELS_DIR` | `/app/ml-pipeline/models` | Path where serialized model artifacts (`.pkl`) reside. |
| `ml-service` | `RESULTS_DIR` | `/app/ml-pipeline/results` | Path where evaluation metrics JSON files reside. |

---

## ⏱️ Rate Limiting Policies

The Express gateway implements rate limiting (`server/src/middleware/rateLimit.middleware.js`) using `express-rate-limit` to protect backend and ML services from abuse and denial of service:

| Policy Name | Window | Max Requests | Scope / Applied To | Response on Limit |
| :--- | :--- | :--- | :--- | :--- |
| **General API Limiter** | 15 minutes | 100 requests per IP | All `/api/*` routes | HTTP 429: `{"error": "Too many requests", "detail": "Rate limit exceeded. Please try again later."}` |
| **Inference Limiter** | 15 minutes | 30 requests per IP | `POST /api/analysis/combined` (What-If Dispatch) | HTTP 429: `{"error": "Inference rate limit exceeded", "detail": "ML model inference is resource-intensive. Please slow down requests."}` |

Standard headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`) are included on all responses.
