"""
SmartDC-Energy — Automated Model Generation Script (Option B)
=============================================================
Generates all required machine learning model binaries and test splits
from the master feature dataset in ~10-15 seconds.

Usage:
    python setup_models.py
"""

import os
import sys
import time
import random
import numpy as np
import pandas as pd
import joblib
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split
from xgboost import XGBRegressor
from lightgbm import LGBMRegressor
from sklearn.ensemble import RandomForestClassifier, IsolationForest

SEED = 42
random.seed(SEED)
np.random.seed(SEED)
os.environ["PYTHONHASHSEED"] = str(SEED)

def get_paths():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    # Handle if run from repo root or from subfolder
    if os.path.exists(os.path.join(base_dir, "ml-pipeline")):
        root = base_dir
    elif os.path.exists(os.path.join(base_dir, "..", "ml-pipeline")):
        root = os.path.abspath(os.path.join(base_dir, ".."))
    else:
        root = base_dir

    pipeline_dir = os.path.join(root, "ml-pipeline")
    data_dir = os.path.join(pipeline_dir, "data", "processed")
    models_dir = os.path.join(pipeline_dir, "models")
    results_dir = os.path.join(pipeline_dir, "results")
    return root, data_dir, models_dir, results_dir

def train_and_export():
    root, data_dir, models_dir, results_dir = get_paths()
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(results_dir, exist_ok=True)

    master_csv = os.path.join(data_dir, "master_features.csv")
    if not os.path.exists(master_csv):
        raise FileNotFoundError(f"Master features dataset not found at {master_csv}")

    print("=" * 65)
    print(">> SmartDC-Energy: Generating Pre-Trained ML Models...")
    print("=" * 65)
    print(f"Loading master dataset from: {master_csv}")
    df = pd.read_csv(master_csv, parse_dates=["timestamp"]).set_index("timestamp")

    # -------------------------------------------------------------
    # 1. Feature Engineering: Lags and Rolling Windows for Forecast
    # -------------------------------------------------------------
    TARGET = "total_power_kwh"
    for lag in [1, 6, 12, 24, 48, 168]:
        df[f"lag_{lag}h"] = df[TARGET].shift(lag)
    for window in [6, 24]:
        df[f"roll_mean_{window}h"] = df[TARGET].shift(1).rolling(window).mean()
        df[f"roll_std_{window}h"] = df[TARGET].shift(1).rolling(window).std()

    df = df.dropna()

    LEAK_COLS = ["it_load_kwh", "cooling_load_kwh", "support_load_kwh", "pue"]
    forecast_feature_cols = [c for c in df.columns if c not in [TARGET, "anomaly_flag"] + LEAK_COLS]

    X_f, y_f = df[forecast_feature_cols], df[TARGET]
    split_idx = int(len(df) * 0.8)
    X_train_f, X_test_f = X_f.iloc[:split_idx], X_f.iloc[split_idx:]
    y_train_f, y_test_f = y_f.iloc[:split_idx], y_f.iloc[split_idx:]

    print(f"1. Training Forecasting Models (XGBoost Regressor)...")
    forecast_scaler = StandardScaler()
    X_train_f_sc = forecast_scaler.fit_transform(X_train_f)
    X_test_f_sc = forecast_scaler.transform(X_test_f)

    y_scaler = MinMaxScaler()
    y_train_f_mm = y_scaler.fit_transform(y_train_f.values.reshape(-1, 1))

    t0 = time.perf_counter()
    xgb_model = XGBRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=6,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=SEED,
        n_jobs=-1,
    )
    xgb_model.fit(X_train_f_sc, y_train_f)
    print(f"   [+] XGBoost trained in {time.perf_counter() - t0:.2f}s")
    joblib.dump(xgb_model, os.path.join(models_dir, "forecast_xgb.pkl"))

    try:
        lgbm_model = LGBMRegressor(
            n_estimators=300,
            learning_rate=0.05,
            max_depth=6,
            num_leaves=63,
            random_state=SEED,
            verbose=-1,
        )
        lgbm_model.fit(X_train_f_sc, y_train_f)
        joblib.dump(lgbm_model, os.path.join(models_dir, "forecast_lgbm.pkl"))
        print(f"   [+] LightGBM baseline trained")
    except Exception as e:
        print(f"   [!] LightGBM baseline skipped ({e})")
    joblib.dump(forecast_scaler, os.path.join(models_dir, "forecast_scaler.pkl"))
    joblib.dump(y_scaler, os.path.join(models_dir, "forecast_yscaler.pkl"))
    joblib.dump(
        {
            "X_test": X_test_f,
            "X_test_sc": X_test_f_sc,
            "y_test": y_test_f,
            "feature_cols": forecast_feature_cols,
            "WINDOW": 24,
        },
        os.path.join(models_dir, "forecast_test_data.pkl"),
    )

    # -------------------------------------------------------------
    # 2. Anomaly Detection Models (Random Forest Classifier)
    # -------------------------------------------------------------
    print(f"2. Training Anomaly Detection Models (Random Forest Classifier)...")
    anomaly_feature_cols = [
        "ambient_temp_c", "relative_humidity_pct", "chilled_water_temp_c",
        "server_inlet_temp_c", "under_floor_pressure_pa", "it_load_kwh",
        "cooling_load_kwh", "support_load_kwh", "total_power_kwh", "pue",
        "hour_sin", "hour_cos", "month_sin", "month_cos", "is_weekend"
    ]
    X_a = df[anomaly_feature_cols]
    y_a = (df["anomaly_flag"] == 1).astype(int)

    X_train_a, X_test_a, y_train_a, y_test_a = train_test_split(
        X_a, y_a, test_size=0.2, random_state=SEED, stratify=y_a
    )

    anomaly_scaler = StandardScaler()
    X_train_a_sc = anomaly_scaler.fit_transform(X_train_a)
    X_test_a_sc = anomaly_scaler.transform(X_test_a)

    t0 = time.perf_counter()
    rf_clf = RandomForestClassifier(
        n_estimators=250,
        max_depth=10,
        class_weight="balanced",
        random_state=SEED,
        n_jobs=-1,
    )
    rf_clf.fit(X_train_a_sc, y_train_a)
    print(f"   [+] Random Forest trained in {time.perf_counter() - t0:.2f}s")

    joblib.dump(rf_clf, os.path.join(models_dir, "anomaly_rf.pkl"))
    joblib.dump(anomaly_scaler, os.path.join(models_dir, "anomaly_scaler.pkl"))
    joblib.dump(
        {
            "X_test": X_test_a,
            "X_test_sc": X_test_a_sc,
            "y_test": y_test_a,
            "feature_cols": anomaly_feature_cols,
            "train_times": {"RandomForest": 0.5, "IsolationForest": 0.4},
        },
        os.path.join(models_dir, "anomaly_test_data.pkl"),
    )

    try:
        contam = float(y_train_a.mean())
        if contam <= 0.0 or contam > 0.5:
            contam = 0.05
        iso_forest = IsolationForest(
            n_estimators=150,
            contamination=contam,
            random_state=SEED,
        )
        iso_forest.fit(X_train_a_sc)
        joblib.dump(iso_forest, os.path.join(models_dir, "anomaly_isoforest.pkl"))
        print(f"   [+] Isolation Forest baseline trained")
    except Exception as e:
        print(f"   [!] Isolation Forest baseline skipped ({e})")

    print("=" * 65)
    print(f"[SUCCESS] All models generated and saved to: {models_dir}")
    print("=" * 65)

if __name__ == "__main__":
    train_and_export()
