"""
Pydantic request/response models. The two feature sets are DIFFERENT and
DELIBERATELY so -- see Notebook 6's walkthrough for why anomaly detection
includes columns (it_load_kwh, cooling_load_kwh, etc.) that forecasting
excludes as leakage. This is not a bug; don't unify these into one schema.
"""
from pydantic import BaseModel, Field
from typing import Optional


class ForecastFeatures(BaseModel):
    ambient_temp_c: float
    relative_humidity_pct: float
    chilled_water_temp_c: float
    server_inlet_temp_c: float
    under_floor_pressure_pa: float
    hour: int
    day_of_week: int
    month: int
    is_weekend: int
    hour_sin: float
    hour_cos: float
    month_sin: float
    month_cos: float
    weekend_energy_kwh: float
    midnight_energy_kwh: float
    lag_1h: float
    lag_6h: float
    lag_12h: float
    lag_24h: float
    lag_48h: float
    lag_168h: float
    roll_mean_6h: float
    roll_std_6h: float
    roll_mean_24h: float
    roll_std_24h: float


class AnomalyFeatures(BaseModel):
    ambient_temp_c: float
    relative_humidity_pct: float
    chilled_water_temp_c: float
    server_inlet_temp_c: float
    under_floor_pressure_pa: float
    it_load_kwh: float
    cooling_load_kwh: float
    support_load_kwh: float
    total_power_kwh: float
    pue: float
    hour_sin: float
    hour_cos: float
    month_sin: float
    month_cos: float
    is_weekend: int


class ForecastResponse(BaseModel):
    forecasted_total_power_kwh: float


class AnomalyResponse(BaseModel):
    anomaly_status: str
    anomaly_probability: float


class CombinedRequest(BaseModel):
    forecast_features: ForecastFeatures
    anomaly_features: AnomalyFeatures


class CombinedResponse(BaseModel):
    forecasted_total_power_kwh: float
    anomaly_status: str
    anomaly_probability: float
    note: str = "Simulated/replayed data — not live telemetry from a real facility."
