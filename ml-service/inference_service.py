"""
Shared prediction logic. This is Notebook 8's predict_hour() generalized to
accept a feature dict from an HTTP request instead of a pre-existing test
row -- same underlying logic, same models, so there is exactly one place
that knows how to call these models. Both the simulation engine and the
what-if endpoint call through here; neither reimplements prediction itself.
"""
import pandas as pd
import model_loader as ml


def predict_forecast(features: dict) -> float:
    """features must contain exactly ml.FORECAST_FEATURE_COLS, any order."""
    row_df = pd.DataFrame([features])[ml.FORECAST_FEATURE_COLS]
    scaled = ml.forecast_scaler.transform(row_df)
    prediction = ml.forecast_model.predict(scaled)[0]
    return round(float(prediction), 2)


def predict_anomaly(features: dict) -> dict:
    """features must contain exactly ml.ANOMALY_FEATURE_COLS, any order."""
    row_df = pd.DataFrame([features])[ml.ANOMALY_FEATURE_COLS]
    scaled = ml.anomaly_scaler.transform(row_df)
    pred = ml.anomaly_model.predict(scaled)[0]
    prob = ml.anomaly_model.predict_proba(scaled)[0, 1]
    return {
        "anomaly_status": "FAILURE" if pred == 1 else "normal",
        "anomaly_probability": round(float(prob), 3),
    }


def predict_combined(forecast_features: dict, anomaly_features: dict) -> dict:
    forecast_kwh = predict_forecast(forecast_features)
    anomaly_result = predict_anomaly(anomaly_features)
    return {
        "forecasted_total_power_kwh": forecast_kwh,
        **anomaly_result,
        "note": "Simulated/replayed data — not live telemetry from a real facility.",
    }
