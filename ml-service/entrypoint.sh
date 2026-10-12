#!/bin/sh
set -e

# Check if model binaries exist. If missing (e.g. fresh git clone), generate them automatically
if [ ! -f "$MODELS_DIR/forecast_xgb.pkl" ]; then
    echo "=================================================================="
    echo ">> Model binaries not found in $MODELS_DIR."
    echo ">> Generating pre-trained ML models from dataset (takes ~5s)..."
    echo "=================================================================="
    python /app/setup_models.py
fi

echo ">> Starting FastAPI ML Inference Microservice on port 8000..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
