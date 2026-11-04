"""Users router: admin/user management endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.repositories import user_repository as repository
from app.models.database import get_db
from app.services import user_service
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from shared_core.exceptions import raise_not_found
from shared_core.security import verify_token

router = APIRouter(tags=["users"])


def require_admin(token: str = Query("")) -> None:
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    payload = verify_token(token)
    if payload is None or payload.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")


@router.post("/api/users", response_model=UserResponse)
async def create_user_endpoint(
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    return user_service.create_new_user(db, user_data)


@router.get("/api/users", response_model=list[UserResponse])
async def list_users_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    role: str | None = None,
    db: Session = Depends(get_db),
):
    return user_service.list_users(db, skip=skip, limit=limit, role=role)


@router.get("/api/users/{user_id}", response_model=UserResponse)
async def get_user_endpoint(user_id: int, db: Session = Depends(get_db)):
    return user_service.read_user(db, user_id)


@router.put("/api/users/{user_id}", response_model=UserResponse)
async def update_user_endpoint(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
):
    return user_service.update_user_endpoint(db, user_id, user_data)


@router.delete("/api/users/{user_id}")
async def delete_user_endpoint(user_id: int, db: Session = Depends(get_db)):
    return user_service.delete_user_endpoint(db, user_id)


@router.get("/admin/users", response_model=list[UserResponse], dependencies=[Depends(require_admin)])
async def admin_list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    return user_service.list_users(db, skip=skip, limit=limit)


@router.get("/admin/users/{user_id}", response_model=UserResponse, dependencies=[Depends(require_admin)])
async def admin_get_user(user_id: int, db: Session = Depends(get_db)):
    return user_service.read_user(db, user_id)


@router.put("/admin/users/{user_id}/role", dependencies=[Depends(require_admin)])
async def admin_update_role(
    user_id: int,
    role: str,
    db: Session = Depends(get_db),
):
    user = repository.get_user_by_id(db, user_id)
    if not user:
        raise_not_found("Usuario")
    repository.update_user(db, user, role=role)
    return {"message": f"Role updated to {role}"}
