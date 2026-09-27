import os
import json
from fastapi import APIRouter, HTTPException

router = APIRouter()

RESULTS_DIR = os.environ.get("RESULTS_DIR", "../ml-pipeline/results")


def _load(filename):
    path = os.path.join(RESULTS_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"{filename} not found — run the evaluation notebooks first")
    with open(path) as f:
        return json.load(f)


@router.get("/analytics/forecast")
def get_forecast_analytics():
    """Model comparison, best model, metrics from Notebook 5."""
    return _load("forecast_results.json")


@router.get("/analytics/anomaly")
def get_anomaly_analytics():
    """Model comparison, ROC-AUC, naive baseline from Notebook 7."""
    return _load("anomaly_results.json")


@router.get("/analytics/summary")
def get_combined_summary():
    """Both results together, for the Model Analytics dashboard view."""
    return {
        "forecast": _load("forecast_results.json"),
        "anomaly": _load("anomaly_results.json"),
    }
