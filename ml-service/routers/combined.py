from fastapi import APIRouter
from schemas import CombinedRequest, CombinedResponse
import inference_service as svc

router = APIRouter()


@router.post("/predict/combined", response_model=CombinedResponse)
def predict_combined(request: CombinedRequest):
    result = svc.predict_combined(
        request.forecast_features.model_dump(),
        request.anomaly_features.model_dump(),
    )
    return CombinedResponse(**result)
