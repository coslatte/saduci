"""Auth views: login, register, me, password, and own profile."""
from __future__ import annotations

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request

from app.controllers.auth import get_current_user
from app.controllers.config import _check_rate_limit, logger, user_client
from app.controllers.proxy import _extract_upstream_detail
from app.schemas.auth import LoginResponse, TokenUser
from shared_core.schemas import (
    LoginRequest,
    PasswordChangeRequest,
    RegisterRequest,
    RegisterResponse,
    UserResponse,
    UserRole,
    UserUpdate,
)
from shared_core.security import create_access_token

router = APIRouter(tags=["auth"])


@router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest, req: Request):
    _check_rate_limit(req.client.host if req.client else "unknown")

    try:
        payload = await user_client.post("/auth/login", request.model_dump(mode="json"))
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="Incorrect username or password")
    except Exception as e:
        logger.error("User service unavailable: %s", e)
        raise HTTPException(status_code=502, detail="Authentication service unavailable")

    user_data = payload.get("user", payload)
    is_superuser = user_data.get("role") == UserRole.ADMIN.value
    user_data["is_superuser"] = is_superuser
    user = UserResponse(**user_data)
    access_token = create_access_token(
        data={
            "sub": user.username,
            "uid": user.id,
            "email": user.email,
            "role": user.role.value,
            "is_superuser": is_superuser,
        },
    )
    return LoginResponse(access_token=access_token, user=user)


@router.post("/auth/register", response_model=RegisterResponse)
async def register(request: RegisterRequest):
    try:
        result = await user_client.post("/auth/register", request.model_dump(mode="json"))
    except httpx.HTTPStatusError as e:
        detail = _extract_upstream_detail(e)
        raise HTTPException(status_code=e.response.status_code, detail=detail)
    except Exception as e:
        logger.error("User service unavailable: %s", e)
        raise HTTPException(status_code=502, detail="Registration service unavailable")
    return RegisterResponse(**result)


@router.get("/auth/me", response_model=UserResponse)
async def read_current_user(current_user: TokenUser = Depends(get_current_user)):
    try:
        user_data = await user_client.get(f"/api/users/{current_user.id}")
    except Exception as e:
        logger.error("User service unavailable: %s", e)
        raise HTTPException(status_code=502, detail="User service unavailable")
    user_data["is_superuser"] = current_user.is_superuser
    return UserResponse(**user_data)


@router.post("/auth/change-password")
async def change_password(
    request: PasswordChangeRequest,
    current_user: TokenUser = Depends(get_current_user),
):
    try:
        await user_client.post(
            "/auth/change-password",
            {
                "current_password": request.current_password,
                "new_password": request.new_password,
            },
            params={"user_id": current_user.id},
        )
    except httpx.HTTPStatusError as e:
        detail = _extract_upstream_detail(e)
        raise HTTPException(status_code=e.response.status_code, detail=detail)
    except Exception as e:
        logger.error("User service unavailable: %s", e)
        raise HTTPException(status_code=502, detail="Password change service unavailable")

    return {"message": "Contraseña actualizada correctamente."}


@router.put("/api/user/profile", response_model=UserResponse)
async def update_own_profile(
    user_data: UserUpdate,
    current_user: TokenUser = Depends(get_current_user),
):
    try:
        result = await user_client.put(
            "/api/user/profile",
            user_data.model_dump(mode="json", exclude_none=True),
            params={"user_id": current_user.id},
        )
    except httpx.HTTPStatusError as e:
        detail = _extract_upstream_detail(e)
        raise HTTPException(status_code=e.response.status_code, detail=detail)
    except Exception as e:
        logger.error("User service unavailable: %s", e)
        raise HTTPException(status_code=502, detail="User service unavailable")
    result["is_superuser"] = current_user.is_superuser
    return UserResponse(**result)
