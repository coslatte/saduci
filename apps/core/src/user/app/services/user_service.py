"""User business logic and startup seed helpers."""
from __future__ import annotations

import os

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories import user_repository as repository
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from shared_core.utils import get_logger

logger = get_logger(__name__)

AUTH_USERNAME = os.getenv("AUTH_USERNAME", "").strip()
AUTH_PASSWORD = os.getenv("AUTH_PASSWORD", "").strip()


def _seed_admin_user(db: Session) -> User:
    admin_username = AUTH_USERNAME
    admin_email = (
        admin_username if "@" in admin_username else f"{admin_username}@saduci.com"
    )
    admin_user = repository.create_user(
        db,
        username=admin_username,
        email=admin_email,
        password=AUTH_PASSWORD,
        role="ADMIN",
    )
    logger.info("Seeded initial admin user '%s'", admin_user.username)
    return admin_user


def create_new_user(db: Session, user_data: UserCreate) -> UserResponse:
    existing_user = repository.get_user_by_identifier(db, user_data.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="El usuario ya existe.")
    if len(user_data.password) < 8:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres.")
    new_user = repository.create_user(
        db,
        username=user_data.username,
        email=user_data.email,
        password=user_data.password,
        role=user_data.role,
        is_active=user_data.is_active,
    )
    return UserResponse.model_validate(new_user)


def read_user(db: Session, user_id: int) -> UserResponse:
    user = repository.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    return UserResponse.model_validate(user)


def list_users(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    role: str | None = None,
) -> list[UserResponse]:
    if role:
        users = repository.get_users_by_role(db, role, skip=skip, limit=limit)
    else:
        users = repository.get_all_users(db, skip=skip, limit=limit)
    return [UserResponse.model_validate(u) for u in users]


def update_user_endpoint(
    db: Session, user_id: int, user_data: UserUpdate
) -> UserResponse:
    user = repository.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if user_data.username is not None:
        if not user_data.username.strip():
            raise HTTPException(
                status_code=400, detail="El nombre de usuario no puede estar vacio."
            )
        existing = repository.get_user_by_username(db, user_data.username)
        if existing and existing.id != user.id:
            raise HTTPException(
                status_code=400, detail="El nombre de usuario ya esta en uso"
            )

    if user_data.email is not None:
        existing_email = repository.get_user_by_email(db, user_data.email)
        if existing_email and existing_email.id != user.id:
            raise HTTPException(
                status_code=400, detail="El correo electronico ya esta registrado"
            )

    updated_user = repository.update_user(
        db,
        user,
        username=user_data.username,
        email=user_data.email,
        role=user_data.role,
        is_active=user_data.is_active,
    )
    return UserResponse.model_validate(updated_user)


def delete_user_endpoint(db: Session, user_id: int) -> dict:
    user = repository.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    repository.delete_user(db, user.id)
    return {"message": "Usuario eliminado correctamente"}


def update_own_profile(
    db: Session, user_id: int, user_data: UserUpdate
) -> UserResponse:
    user = repository.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    updated_user = repository.update_user(
        db,
        user,
        email=user_data.email,
        avatar=user_data.avatar,
    )
    return UserResponse.model_validate(updated_user)
