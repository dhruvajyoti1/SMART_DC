from fastapi import APIRouter
from schemas import ForecastFeatures, ForecastResponse
import inference_service as svc

router = APIRouter()


@router.post("/predict/forecast", response_model=ForecastResponse)
def predict_forecast(features: ForecastFeatures):
    kwh = svc.predict_forecast(features.model_dump())
    return ForecastResponse(forecasted_total_power_kwh=kwh)
