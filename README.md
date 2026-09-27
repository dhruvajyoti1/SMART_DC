# SmartDC-Energy

An end-to-end data center energy management and operations analytics platform. Built as a B.Tech CSE Final Year Capstone Project.

## Architecture

This project consists of 4 main components:
1. **Client**: React 18 + Vite + Tailwind CSS frontend (SCADA-themed DCS control interface)
2. **Server**: Node.js + Express backend (handles DB logging and proxies ML requests)
3. **ML Service**: Python + FastAPI microservice (runs inference and simulations)
4. **ML Pipeline**: Jupyter notebooks for data cleaning, feature engineering, model training, and evaluation

## Features

- **Energy Forecasting**: Predicts hourly total power consumption. Three models benchmarked — **XGBoost** (champion, R² = 0.894), LightGBM, and LSTM — with XGBoost selected for production inference.
- **Anomaly Detection**: Classifies operating states as normal or FAILURE using **Random Forest** (F1 = 0.994). Isolation Forest also evaluated as a baseline.
- **Live Operations Dashboard**: Replays historical sensor data via a synchronous 3-second polling loop, displaying bay annunciators, multi-graph telemetry (demand, variance, anomaly risk), and a Sequence of Events (SOE) historian log.
- **What-If Analysis**: An interactive scenario dispatch lab to simulate custom thermal, environmental, and compute load configurations with dual ML inference.
- **Model Analytics**: Displays regression metrics, feature importance, classification metrics, and naive baseline comparisons from held-out test sets.
- **SCADA Authentication**: Operator workstation login gate with session persistence options.

## Getting Started

### Prerequisites

- **Node.js** 20+ and npm
- **Python** 3.10+ and pip
- **MongoDB** 6+ (local or Atlas)
- **Trained ML models** — see [Generating Models](#generating-ml-models) below

### Using Docker Compose

The easiest way to run the entire stack (MongoDB, ML Service, Server, and Client) is using Docker Compose:

```bash
docker-compose up -d
```

Once running:
- Frontend Client: `http://localhost:5173`
- Express API: `http://localhost:4000`
- FastAPI ML Service: `http://localhost:8000/docs`

### Manual Setup

If you prefer to run the services manually without Docker:

**1. MongoDB**
Ensure you have MongoDB running locally on port `27017`.

**2. ML Service (FastAPI)** — *must be started before the Express server*
```bash
cd ml-service
python -m venv venv
# On Windows: venv\Scripts\activate
# On Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**3. Express Server**
```bash
cd server
npm install
npm run dev
```

**4. React Client**
```bash
cd client
npm install
npm run dev
```

### Default Login Credentials

The login page comes pre-filled with demo credentials. Simply click **"Authenticate & Unlock Control System"** to enter the dashboard. No backend authentication server is required — session state is managed client-side.

### Environment Variables

The Express server reads the following variables (with defaults):

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Express server port |
| `MONGODB_URI` | `mongodb://localhost:27017/smartdc-energy` | MongoDB connection string |
| `ML_SERVICE_URL` | `http://localhost:8000` | FastAPI ML service URL |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin(s), comma-separated |

### Generating ML Models

The ML service requires pre-trained model files (`*.pkl`, `*.h5`) in `ml-pipeline/models/`. These are not tracked in git (binary artifacts). To generate them:

```bash
cd ml-pipeline
pip install -r requirements.txt
```

Then run the Jupyter notebooks **in order**:
1. `01_data_cleaning.ipynb` — Cleans raw telemetry data
2. `02_feature_engineering.ipynb` — Generates lag, cyclical, and rolling features
3. `03_eda.ipynb` — Exploratory data analysis
4. `04_forecasting_models.ipynb` — Trains XGBoost, LightGBM, and LSTM
5. `05_forecasting_evaluation.ipynb` — Evaluates and saves `forecast_results.json`
6. `06_anomaly_models.ipynb` — Trains Random Forest and Isolation Forest
7. `07_anomaly_evaluation.ipynb` — Evaluates and saves `anomaly_results.json`
8. `08_integration.ipynb` — End-to-end integration test

After running all notebooks, the `ml-pipeline/models/` directory will contain the required `.pkl` and `.h5` files, and `ml-pipeline/results/` will contain the evaluation JSON files.

## Project Structure

```
SmartDC-Energy/
├── client/                    # React 18 + Vite + Tailwind CSS
│   └── src/
│       ├── api/               # Axios API client (proxied via Vite)
│       ├── components/        # Reusable UI components (badges, icons, stat cards)
│       ├── context/           # React contexts (Auth, Telemetry)
│       └── pages/             # Page components (Live, Analytics, WhatIf, About, Login)
├── server/                    # Node.js + Express backend
│   └── src/
│       ├── config/            # MongoDB connection
│       ├── models/            # Mongoose schemas (SimulationLog, AnalysisQuery)
│       ├── routes/            # API routes (live, analysis, analytics)
│       └── services/          # ML service HTTP client
├── ml-service/                # Python + FastAPI inference microservice
│   ├── routers/               # FastAPI routers (forecast, anomaly, combined, simulation, analytics)
│   ├── inference_service.py   # Shared prediction logic
│   ├── model_loader.py        # Singleton model loading
│   ├── simulation_engine.py   # Historical data replay engine
│   └── schemas.py             # Pydantic request/response models
├── ml-pipeline/               # Jupyter notebooks + training data
│   ├── data/                  # Raw and processed datasets
│   ├── models/                # Trained model artifacts (gitignored)
│   ├── results/               # Evaluation result JSONs (tracked)
│   └── notebooks/             # 8 sequential Jupyter notebooks
├── docker-compose.yml
└── README.md
```
