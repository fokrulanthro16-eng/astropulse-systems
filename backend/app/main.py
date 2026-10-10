"""AstroPulse Systems - NASA Space Apps Challenge 2026.
Astronaut Health Monitoring & Anomaly Detection Telemetry Backend.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import APP_NAME, APP_DESCRIPTION, VERSION
from app.routers import telemetry_router, simulation_router

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s"
)
logger = logging.getLogger("astropulse.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing AstroPulse Telemetry Engine...")
    yield
    logger.info("Shutting down AstroPulse Telemetry Engine...")


app = FastAPI(
    title=APP_NAME,
    description=APP_DESCRIPTION,
    version=VERSION,
    lifespan=lifespan
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(telemetry_router)
app.include_router(simulation_router)


@app.get("/api/health")
async def health_check():
    return {
        "status": "HEALTHY",
        "service": APP_NAME,
        "version": VERSION,
        "mode": "ACTIVE_TELEMETRY"
    }


if __name__ == "__main__":
    import uvicorn
    from app.config import HOST, PORT
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
