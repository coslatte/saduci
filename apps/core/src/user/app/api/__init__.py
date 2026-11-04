from app.api.auth_router import router as auth_router
from app.api.health_router import router as health_router
from app.api.users_router import router as users_router

__all__ = ["auth_router", "health_router", "users_router"]
