from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import simulation_engine as sim
import inference_service as svc

router = APIRouter()


class SimulationTickResponse(BaseModel):
    timestamp: str
    forecasted_total_power_kwh: float
    anomaly_status: str
    anomaly_probability: float
    position: int
    total_ticks: int
    is_exhausted: bool
    pue: float | None = None
    it_load_kwh: float | None = None
    cooling_load_kwh: float | None = None
    support_load_kwh: float | None = None
    ambient_temp_c: float | None = None
    server_inlet_temp_c: float | None = None
    chilled_water_temp_c: float | None = None
    relative_humidity_pct: float | None = None
    under_floor_pressure_pa: float | None = None
    note: str = "Simulated/replayed historical data — not a live facility feed."


class SimulationStatus(BaseModel):
    position: int
    total_ticks: int
    is_exhausted: bool
    current_timestamp: str | None


@router.get("/simulation/tick", response_model=SimulationTickResponse)
def get_tick():
    """Returns the current tick's combined prediction and real-time facility telemetry, then advances the simulation."""
    current = sim.simulation.get_current_features()
    if current is None:
        raise HTTPException(status_code=410, detail="Simulation exhausted — call /simulation/reset")

    forecast_features, anomaly_features, ts = current
    result = svc.predict_combined(forecast_features, anomaly_features)
    position = sim.simulation.position
    sim.simulation.advance()

    return SimulationTickResponse(
        timestamp=str(ts),
        forecasted_total_power_kwh=result["forecasted_total_power_kwh"],
        anomaly_status=result["anomaly_status"],
        anomaly_probability=result["anomaly_probability"],
        position=position,
        total_ticks=sim.simulation.total_ticks,
        is_exhausted=sim.simulation.is_exhausted,
        pue=round(float(anomaly_features["pue"]), 3) if "pue" in anomaly_features else None,
        it_load_kwh=round(float(anomaly_features["it_load_kwh"]), 1) if "it_load_kwh" in anomaly_features else None,
        cooling_load_kwh=round(float(anomaly_features["cooling_load_kwh"]), 1) if "cooling_load_kwh" in anomaly_features else None,
        support_load_kwh=round(float(anomaly_features["support_load_kwh"]), 1) if "support_load_kwh" in anomaly_features else None,
        ambient_temp_c=round(float(anomaly_features["ambient_temp_c"]), 1) if "ambient_temp_c" in anomaly_features else None,
        server_inlet_temp_c=round(float(anomaly_features["server_inlet_temp_c"]), 1) if "server_inlet_temp_c" in anomaly_features else None,
        chilled_water_temp_c=round(float(anomaly_features["chilled_water_temp_c"]), 1) if "chilled_water_temp_c" in anomaly_features else None,
        relative_humidity_pct=round(float(anomaly_features["relative_humidity_pct"]), 1) if "relative_humidity_pct" in anomaly_features else None,
        under_floor_pressure_pa=round(float(anomaly_features["under_floor_pressure_pa"]), 1) if "under_floor_pressure_pa" in anomaly_features else None,
    )


@router.post("/simulation/reset")
def reset_simulation():
    sim.simulation.reset()
    return {"status": "reset", "position": 0}


@router.get("/simulation/status", response_model=SimulationStatus)
def get_status():
    ts = sim.simulation.current_timestamp
    return SimulationStatus(
        position=sim.simulation.position,
        total_ticks=sim.simulation.total_ticks,
        is_exhausted=sim.simulation.is_exhausted,
        current_timestamp=str(ts) if ts is not None else None,
    )
