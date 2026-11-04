"""Auth router: login / register / profile endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.repositories import user_repository as repository
from app.models.database import get_db
from app.schemas.user import LoginRequest, PasswordChangeRequest, RegisterRequest, RegisterResponse, UserResponse, UserUpdate
from app.services import user_service
from shared_core.security import create_access_token, verify_password

router = APIRouter(tags=["auth"])


@router.post("/auth/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = repository.authenticate_user(db, request.username, request.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="User account is disabled")
    token = create_access_token(data={"sub": user.username, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "user": UserResponse.model_validate(user)}


@router.post("/auth/register", response_model=RegisterResponse)
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    result = _create_new_user_local(db, request)
    return RegisterResponse(
        message="Usuario registrado correctamente",
        user=result,
    )


@router.get("/auth/me", response_model=UserResponse)
async def get_me(db: Session = Depends(get_db)):
    raise HTTPException(status_code=501, detail="Not implemented - use gateway auth")


@router.post("/auth/change-password")
async def change_password(
    request: PasswordChangeRequest,
    user_id: int,
    db: Session = Depends(get_db),
):
    """El gateway valida el JWT y delega aqui pasando el user_id.

    Antes devolvia 501 y el gateway proxeya a /users/{id}/change-password,
    ruta que no existe: el cambio de contrasena estaba roto de punta a punta.
    """
    user = repository.get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    if not verify_password(request.current_password, user.hashed_password):
        raise HTTPException(
            status_code=400, detail="La contraseña actual es incorrecta"
        )
    repository.update_password(db, user, request.new_password)
    return {"message": "Contraseña actualizada correctamente."}


@router.put("/api/user/profile", response_model=UserResponse)
async def update_profile(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
):
    return user_service.update_own_profile(db, user_id, user_data)


def _create_new_user_local(db: Session, request: RegisterRequest) -> UserResponse:
    existing_user = repository.get_user_by_username(db, request.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya esta en uso")
    existing_email = repository.get_user_by_email(db, request.email)
    if existing_email:
        raise HTTPException(status_code=400, detail="El correo electronico ya esta registrado")
    if len(request.password) < 8:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres")
    new_user = repository.create_user(
        db, username=request.username, email=request.email, password=request.password
    )
    return UserResponse.model_validate(new_user)
