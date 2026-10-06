
"""
Main FastAPI Application Entry Point
AI-Driven Business Lifecycle Decision Support System
"""

import sys
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure the project root is available for imports
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.database import engine, Base
from backend.routes.analysis import router as analysis_router
from backend.routes.intake import router as intake_router
from backend.routes.business_plan import router as plan_router
from backend.schemas import HealthCheckResponse
from src.prediction.predictor import DEFAULT_MODEL_DIR

from backend.app.api.component2_routes import router as component2_router

# Create database tables if they do not exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SME360 AI Decision Support API",
    description=(
        "SME360 AI REST API for business feasibility prediction, "
        "AI intake, business planning, and Component 2 regulatory compliance."
    ),
    version="1.2.0",
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Component 1 routes
app.include_router(analysis_router)
app.include_router(intake_router)
app.include_router(plan_router)

# Component 2 routes
app.include_router(component2_router)


@app.get("/api/health", response_model=HealthCheckResponse, tags=["Health"])
def health_check():
    rf_exists = os.path.exists(
        os.path.join(DEFAULT_MODEL_DIR, "random_forest.joblib")
    )
    prep_exists = os.path.exists(
        os.path.join(DEFAULT_MODEL_DIR, "preprocessor.joblib")
    )

    return {
        "status": "healthy",
        "component": "SME360 AI — Feasibility & Growth Decision Support Engine",
        "version": "1.2.0",
        "model_loaded": rf_exists and prep_exists,
    }


@app.get("/")
def root():
    return {
        "system": "AI-Driven Business Lifecycle Decision Support System",
        "active_component": "Component 1 and Component 2",
        "region": "Western Province, Colombo District, Sri Lanka",
        "status": "online",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
