from fastapi import APIRouter
from schemas import AnomalyFeatures, AnomalyResponse
import inference_service as svc

router = APIRouter()


@router.post("/predict/anomaly", response_model=AnomalyResponse)
def predict_anomaly(features: AnomalyFeatures):
    result = svc.predict_anomaly(features.model_dump())
    return AnomalyResponse(**result)
