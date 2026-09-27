"""
Loads every trained model and scaler exactly once, at import time.
Never call joblib.load() or load_model() anywhere else in this service --
reloading a model per-request is the "reload model every request" trap
flagged in the Phase A plan.
"""
import os
import joblib
from tensorflow.keras.models import load_model

MODELS_DIR = os.environ.get("MODELS_DIR", "../ml-pipeline/models")

def _path(filename):
    return os.path.join(MODELS_DIR, filename)

print("Loading forecasting models...")
forecast_model = joblib.load(_path("forecast_xgb.pkl"))
forecast_scaler = joblib.load(_path("forecast_scaler.pkl"))
forecast_yscaler = joblib.load(_path("forecast_yscaler.pkl"))
forecast_test_data = joblib.load(_path("forecast_test_data.pkl"))
FORECAST_FEATURE_COLS = forecast_test_data["feature_cols"]

print("Loading anomaly detection models...")
anomaly_model = joblib.load(_path("anomaly_rf.pkl"))
anomaly_scaler = joblib.load(_path("anomaly_scaler.pkl"))
anomaly_test_data = joblib.load(_path("anomaly_test_data.pkl"))
ANOMALY_FEATURE_COLS = anomaly_test_data["feature_cols"]

print("All models loaded.")
print(f"  Forecast features ({len(FORECAST_FEATURE_COLS)}):", FORECAST_FEATURE_COLS)
print(f"  Anomaly features ({len(ANOMALY_FEATURE_COLS)}):", ANOMALY_FEATURE_COLS)
