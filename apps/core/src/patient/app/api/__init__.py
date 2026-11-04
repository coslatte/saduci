from app.api.patients_router import router as patients_router
from app.api.health_router import router as health_router

__all__ = ["patients_router", "health_router"]
