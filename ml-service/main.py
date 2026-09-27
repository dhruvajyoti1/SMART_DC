"""
FastAPI app entry point. Run with:
    uvicorn main:app --reload --port 8000
Then visit http://localhost:8000/docs for the interactive Swagger UI.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Importing model_loader here (indirectly, via the routers) triggers the
# one-time model load BEFORE the app starts accepting requests.
from routers import forecast, anomaly, combined, simulation, analytics
import inference_service as svc
import model_loader as ml

app = FastAPI(title="SmartDC-Energy ML Service", version="1.0")

# CORS configured explicitly from the start -- flagged in the Phase A plan
# as one of the most common real friction points in MERN + separate-service setups.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forecast.router, tags=["forecast"])
app.include_router(anomaly.router, tags=["anomaly"])
app.include_router(combined.router, tags=["combined"])
app.include_router(simulation.router, tags=["simulation"])
app.include_router(analytics.router, tags=["analytics"])


@app.on_event("startup")
def startup_sanity_check():
    """
    A model that loads without error can still be silently broken --
    flagged explicitly in the Phase A plan. Run one known prediction and
    confirm it lands in a realistic range before declaring the service ready.
    """
    sample_row = ml.forecast_test_data["X_test"].iloc[0].to_dict()
    prediction = svc.predict_forecast(sample_row)
    if not (5000 <= prediction <= 15000):
        raise RuntimeError(
            f"Startup sanity check FAILED: forecast model produced {prediction}, "
            f"outside the realistic 5000-15000 kWh range. Model may be corrupted."
        )
    print(f"Startup sanity check passed (sample prediction: {prediction} kWh)")


@app.get("/")
def health_check():
    return {"status": "ok", "service": "SmartDC-Energy ML Service"}
