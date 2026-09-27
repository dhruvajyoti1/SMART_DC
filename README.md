# SmartDC-Energy

An end-to-end data center energy management and operations analytics platform. Built as a B.Tech CSE Final Year Capstone Project.

## Architecture

This project consists of 4 main components:
1. **Client**: React 18 + Vite + Tailwind CSS frontend
2. **Server**: Node.js + Express backend (handles DB logging and proxies ML requests)
3. **ML Service**: Python + FastAPI microservice (runs inference and simulations)
4. **ML Pipeline**: Jupyter notebooks for data cleaning, model training, and evaluation

## Getting Started

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

**2. ML Service (FastAPI)**
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

## Features
- **Energy Forecasting**: Predicts hourly total power consumption using XGBoost.
- **Anomaly Detection**: Classifies operating states as normal or FAILURE using Random Forest.
- **What-If Analysis**: An interactive tool to simulate custom feature inputs.
- **Live Operations**: A dashboard replaying historical sensor data to simulate real-time monitoring.
