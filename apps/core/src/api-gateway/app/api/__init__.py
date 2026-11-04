from app.api.auth_router import router as auth_router
from app.api.health_router import router as health_router
from app.api.patients_router import router as patients_router
from app.api.predictions_router import router as predictions_router
from app.api.simulations_router import router as simulations_router
from app.api.statistics_router import router as statistics_router
from app.api.users_router import router as users_router
from app.api.websocket_router import router as websocket_router

__all__ = ["auth_router", "health_router", "patients_router", "predictions_router", "simulations_router", "statistics_router", "users_router", "websocket_router"]
