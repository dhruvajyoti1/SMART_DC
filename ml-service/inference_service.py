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
    rf_prob = float(ml.anomaly_model.predict_proba(scaled)[0, 1])

    # Physical SCADA Operational Risk Evaluation
    # 1. Substation Power Thresholds (Baseline 9,707.7 kW, Warning 9,950 kW, Trip 10,450 kW)
    total_power = float(features.get("total_power_kwh", 0))
    if total_power >= 10450:
        power_risk = min(0.98, 0.65 + ((total_power - 10450) / 1000) * 0.5)
    elif total_power >= 9950:
        power_risk = 0.18 + ((total_power - 9950) / (10450 - 9950)) * (0.45 - 0.18)
    elif total_power > 9707.71:
        power_risk = 0.03 + ((total_power - 9707.71) / (9950 - 9707.71)) * (0.18 - 0.03)
    else:
        power_risk = max(0.008, 0.03 * (total_power / 9707.71))

    # 2. ASHRAE TC 9.9 Thermal Limits (Server Inlet: standard < 24.0°C, caution > 27.0°C, critical > 30.0°C)
    inlet_temp = float(features.get("server_inlet_temp_c", 22.0))
    thermal_risk = 0.0
    if inlet_temp >= 30.0:
        thermal_risk = 0.70 + min(0.25, (inlet_temp - 30.0) * 0.1)
    elif inlet_temp >= 27.0:
        thermal_risk = 0.20 + ((inlet_temp - 27.0) / 3.0) * 0.35

    # 3. PUE Efficiency Envelope (Nominal < 1.25, caution > 1.30, critical > 1.38)
    pue = float(features.get("pue", 1.15))
    pue_risk = 0.0
    if pue >= 1.38:
        pue_risk = 0.50 + min(0.40, (pue - 1.38) * 3.0)
    elif pue >= 1.25:
        pue_risk = 0.12 + ((pue - 1.25) / (1.38 - 1.25)) * (0.45 - 0.12)

    composite_prob = max(rf_prob, power_risk, thermal_risk, pue_risk)
    is_trip = pred == 1 or composite_prob >= 0.45 or total_power >= 10450

    return {
        "anomaly_status": "FAILURE" if is_trip else "normal",
        "anomaly_probability": round(float(composite_prob), 3),
    }


def predict_combined(forecast_features: dict, anomaly_features: dict) -> dict:
    forecast_kwh = predict_forecast(forecast_features)
    anomaly_result = predict_anomaly(anomaly_features)
    return {
        "forecasted_total_power_kwh": forecast_kwh,
        **anomaly_result,
        "note": "Simulated/replayed data — not live telemetry from a real facility.",
    }
