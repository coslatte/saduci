"""User service - user management and authentication (MVC entry point)."""
from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.models.database import Base, SessionLocal, engine, get_db
from app.models.user import User
from app.repositories import count_users
from app.api import auth_router, health_router, users_router
from app.services import _seed_admin_user


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # El esquema lo gestiona Alembic (alembic upgrade head). Aqui solo se
    # siembra el administrador inicial la primera vez.
    with SessionLocal() as db:
        if count_users(db) == 0:
            if not os.getenv("AUTH_USERNAME") or not os.getenv("AUTH_PASSWORD"):
                raise RuntimeError(
                    "AUTH_USERNAME and AUTH_PASSWORD must be configured to seed the initial admin user",
                )
            _seed_admin_user(db)
    yield


app = FastAPI(
    title="User Service",
    description="User management and authentication service",
    version="1.0.0",
    lifespan=lifespan,
)
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(users_router)

__all__ = [
    "Base",
    "SessionLocal",
    "User",
    "app",
    "engine",
    "get_db",
]

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "7001"))
    uvicorn.run(app, host="0.0.0.0", port=port)
