"""Crisis Simulation Router for AstroPulse Systems (Level 3).

Enables flight directors to inject physiological in-flight anomalies,
simulating hypoxic events, hypercapnic ECLSS failures, microgravity deconditioning,
and automated 15-second closed-loop clinical recovery trajectories.
"""

from fastapi import APIRouter
from app.models.telemetry import (
    CrisisSimulationRequest,
    SimulationStatusResponse,
    SimulationMode
)
from app.services.biometric_engine import biometric_engine

router = APIRouter(prefix="/api/simulate", tags=["Simulation Control"])


@router.post("/crisis", response_model=SimulationStatusResponse)
async def trigger_crisis_simulation(request: CrisisSimulationRequest):
    """
    Set or toggle simulated crisis condition.
    
    Modes:
    - NORMAL: Restores baseline nominal flight physiology
    - HYPOXIA_CRITICAL: Induces rapid capillary arterial O2 desaturation (<85%) and tachycardia
    - HYPERCAPNIA_CRISIS: Induces toxic cabin CO2 spike (>3,800 ppm) from ECLSS scrubber failure
    - CARDIAC_DECONDITIONING: Induces collapsed HRV RMSSD (<18 ms) and autonomic microgravity deconditioning
    - RAPID_DECOMPRESSION: Suit pressure loss & acute hypoxemia
    - RECOVERY: Automated 15-second closed-loop physiological stabilization
    """
    biometric_engine.set_simulation_mode(
        mode=request.mode,
        custom_co2=request.custom_co2_override,
        custom_spo2=request.custom_spo2_target,
        custom_hr=request.custom_hr_target,
    )
    status_data = biometric_engine.get_simulation_status()
    return SimulationStatusResponse(**status_data)


@router.post("/recover", response_model=SimulationStatusResponse)
async def trigger_closed_loop_recovery():
    """
    Trigger automatic 15-second closed-loop physiological recovery trajectory.
    Engaged automatically when all 4 emergency countermeasure checklist items are verified.
    """
    biometric_engine.trigger_closed_loop_recovery()
    status_data = biometric_engine.get_simulation_status()
    return SimulationStatusResponse(**status_data)


@router.get("/status", response_model=SimulationStatusResponse)
async def get_simulation_status():
    """Retrieve current crisis simulation status and elapsed time."""
    status_data = biometric_engine.get_simulation_status()
    return SimulationStatusResponse(**status_data)


@router.post("/reset", response_model=SimulationStatusResponse)
async def reset_simulation():
    """Quick reset to Nominal Flight Operations."""
    biometric_engine.set_simulation_mode(SimulationMode.NORMAL)
    status_data = biometric_engine.get_simulation_status()
    return SimulationStatusResponse(**status_data)
