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
    note: str = "Simulated/replayed historical data — not a live facility feed."


class SimulationStatus(BaseModel):
    position: int
    total_ticks: int
    is_exhausted: bool
    current_timestamp: str | None


@router.get("/simulation/tick", response_model=SimulationTickResponse)
def get_tick():
    """Returns the current tick's combined prediction, then advances the simulation."""
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
