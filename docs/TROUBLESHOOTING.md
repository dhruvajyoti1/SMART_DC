# 🔧 Troubleshooting Guide — SmartDC-Energy

This guide addresses common setup, runtime, and connection issues encountered when running the SmartDC-Energy platform locally or in containers.

---

## ⚡ Quick Diagnosis Matrix

| Symptom / Error | Likely Cause | Exact Fix |
| :--- | :--- | :--- |
| `502 ML service unavailable` | Express started before FastAPI ML microservice was running. | Stop Express. Start the ML microservice first (`cd ml-service && uvicorn main:app --port 8000`), verify [http://localhost:8000/docs](http://localhost:8000/docs), then start Express (`cd server && npm run dev`). |
| `connect ECONNREFUSED 127.0.0.1:8000` | FastAPI ML microservice is not running. | Run `uvicorn main:app --port 8000` inside `ml-service/` using your activated Python virtual environment. |
| `connect ECONNREFUSED 127.0.0.1:27017` | MongoDB daemon is not running. | Start local MongoDB via terminal: `mongod --dbpath <data_dir>` or Windows Service: `net start MongoDB`. |
| `FileNotFoundError: forecast_xgb.pkl` | Model binaries were not generated after cloning. | Run `python setup_models.py` from the project root. Generates all 7 `.pkl` artifacts in ~3 seconds. |
| `UnauthorizedAccess` / Script Execution Error (PowerShell) | Windows PowerShell blocks unsigned scripts by default. | Run PowerShell as Administrator and execute:<br>`Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| Port already in use (`EADDRINUSE: 4000`, `5173`, `8000`) | A previous instance or background process occupies the port. | Identify and kill the owning process (see [Port Conflicts](#port-conflicts) below). |
| `npm test` times out or stalls on first run | `mongodb-memory-server` is downloading the MongoDB binary (~100 MB). | Allow 1–2 minutes for the initial download to complete. Subsequent runs use the cached binary in milliseconds. |
| `IndexError: index 1 is out of bounds for axis 1 with size 1` | Model was trained on only one class label. | Re-run `python setup_models.py` to ensure `anomaly_flag` failure labels are properly vectorized. |

---

## 🔌 Detailed Solutions

### 1. Startup Sequence & Connection Refused (`502` / `ECONNREFUSED`)

SmartDC-Energy uses an API Gateway architecture where the Express server proxies ML requests to FastAPI:

```
MongoDB (27017) ➔ FastAPI (8000) ➔ Express Gateway (4000) ➔ React Client (5173)
```

If you start Express before FastAPI, any client requests hitting `/api/live/tick` or `/api/analysis/combined` will trigger `ECONNREFUSED` from Axios, and Express will respond with HTTP 502.

**Verification**:
```bash
# Verify ML service is healthy
curl http://localhost:8000/
# Expected: {"status": "ok", "service": "SmartDC-Energy ML Service"}

# Verify Express gateway is healthy
curl http://localhost:4000/
# Expected: {"status": "ok", "service": "SmartDC-Energy Express Server"}
```

---

### 2. Missing ML Model Binaries (`.pkl` Files)

Because serialized models (`*.pkl`, `*.h5`) are large binary files, they are git-ignored to prevent GitHub 100 MB push rejections (`GH001`).

If `ml-service` fails with `FileNotFoundError: .../ml-pipeline/models/forecast_xgb.pkl`:

```bash
# From the repository root:
python setup_models.py
```

This trains the XGBoost Regressor, Random Forest Classifier, and input scalers from `ml-pipeline/data/processed/master_features.csv` in ~3 seconds and saves all artifacts to `ml-pipeline/models/`.

---

### 3. Port Conflicts

If a service fails to start because a port is occupied:

#### Windows (PowerShell):
```powershell
# Find process using port 4000, 5173, 8000, or 27017
Get-NetTCPConnection -LocalPort 4000, 5173, 8000, 27017 -ErrorAction SilentlyContinue | Select-Object LocalPort, State, OwningProcess

# Terminate process by PID
Stop-Process -Id <PID> -Force
```

#### macOS / Linux:
```bash
# Find and terminate process
lsof -ti :4000 | xargs kill -9
lsof -ti :8000 | xargs kill -9
lsof -ti :5173 | xargs kill -9
```

---

### 4. Windows PowerShell Virtual Environment Activation

If `venv\Scripts\Activate.ps1` gives the error:
```
File ...\Activate.ps1 cannot be loaded because running scripts is disabled on this system.
```

Open PowerShell as your current user and run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Alternatively, invoke Python directly without activating the environment:
```powershell
.\venv\Scripts\python.exe -m uvicorn main:app --port 8000 --host 0.0.0.0
```

---

### 5. MongoDB Diagnostics

Verify local MongoDB daemon connectivity:
```bash
mongosh --eval "db.runCommand({ ping: 1 })"
```
Expected output: `{ ok: 1 }`.

If you use MongoDB Atlas, ensure your connection string in `server/.env` is formatted properly:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/smartdc-energy?retryWrites=true&w=majority
```
Make sure your current IP address is whitelisted in Atlas Network Access.
