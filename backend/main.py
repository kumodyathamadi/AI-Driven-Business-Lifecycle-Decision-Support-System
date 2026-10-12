
"""
Main FastAPI Application Entry Point
AI-Driven Business Lifecycle Decision Support System
"""

import sys
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.component2_routes import router as component2_router

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

# Register Component 2 Router
app.include_router(component2_router)

@app.get("/")
def root():
    return {
        "system": "AI-Driven Business Lifecycle Decision Support System",
        "active_component": "Component 1 and Component 2",
        "region": "Western Province, Colombo District, Sri Lanka",
        "status": "online"
    }



if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
