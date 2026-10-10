"""Routers package."""
from .telemetry import router as telemetry_router
from .simulation import router as simulation_router

__all__ = ["telemetry_router", "simulation_router"]
