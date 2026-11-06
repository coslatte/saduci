"""User management and admin user proxy routes."""
from __future__ import annotations

import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.controllers.auth import get_current_user
from app.controllers.config import logger, user_client
from app.controllers.proxy import _extract_upstream_detail
from app.schemas.auth import TokenUser
from shared_core.schemas import UserCreate, UserResponse, UserUpdate

router = APIRouter(tags=["users"])


@router.post("/api/users", response_model=UserResponse)
async def create_new_user(
    user_data: UserCreate,
    _current_user: TokenUser = Depends(get_current_user),
):
    try:
        result = await user_client.post("/api/users", user_data.model_dump(mode="json"))
    except httpx.HTTPStatusError as e:
        detail = _extract_upstream_detail(e)
        raise HTTPException(status_code=e.response.status_code, detail=detail)
    except Exception as e:
        logger.error("User service unavailable: %s", e)
        raise HTTPException(status_code=502, detail="User service unavailable")
    return UserResponse(**result)


@router.get("/api/users/{user_id}", response_model=UserResponse)
async def read_user(
    user_id: int,
    _current_user: TokenUser = Depends(get_current_user),
):
    try:
        result = await user_client.get(f"/api/users/{user_id}")
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail="Usuario no encontrado.")
        detail = _extract_upstream_detail(e)
        raise HTTPException(status_code=e.response.status_code, detail=detail)
    except Exception as e:
        logger.error("User service unavailable: %s", e)
        raise HTTPException(status_code=502, detail="User service unavailable")
    return UserResponse(**result)


@router.get("/api/users", response_model=list[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    role: str | None = None,
    _current_user: TokenUser = Depends(get_current_user),
):
    try:
        params = f"skip={skip}&limit={limit}"
        if role:
            params += f"&role={role}"
        result = await user_client.get(f"/api/users?{params}")
    except Exception as e:
        logger.error("User service unavailable: %s", e)
        raise HTTPException(status_code=502, detail="User service unavailable")
    return [UserResponse(**u) for u in result]


@router.put("/api/users/{user_id}", response_model=UserResponse)
async def update_user_endpoint(
    user_id: int,
    user_data: UserUpdate,
    _current_user: TokenUser = Depends(get_current_user),
):
    try:
        result = await user_client.put(
            f"/api/users/{user_id}", user_data.model_dump(mode="json", exclude_none=True)
        )
    except httpx.HTTPStatusError as e:
        detail = _extract_upstream_detail(e)
        raise HTTPException(status_code=e.response.status_code, detail=detail)
    except Exception as e:
        logger.error("User service unavailable: %s", e)
        raise HTTPException(status_code=502, detail="User service unavailable")
    return UserResponse(**result)


@router.delete("/api/users/{user_id}")
async def delete_user_endpoint(
    user_id: int,
    _current_user: TokenUser = Depends(get_current_user),
):
    try:
        await user_client.delete(f"/api/users/{user_id}")
    except httpx.HTTPStatusError as e:
        detail = _extract_upstream_detail(e)
        raise HTTPException(status_code=e.response.status_code, detail=detail)
    except Exception as e:
        logger.error("User service unavailable: %s", e)
        raise HTTPException(status_code=502, detail="User service unavailable")
    return {"message": "Usuario eliminado correctamente."}


@router.get("/admin/users", response_model=list[UserResponse])
async def list_users_admin(
    _current_user: TokenUser = Depends(get_current_user),
):
    try:
        result = await user_client.get("/api/users")
    except Exception as e:
        logger.error("User service unavailable: %s", e)
        raise HTTPException(status_code=502, detail="User service unavailable")
    return [UserResponse(**u) for u in result]


@router.post("/admin/users", response_model=UserResponse)
async def create_user_admin(
    request: UserCreate,
    _current_user: TokenUser = Depends(get_current_user),
):
    try:
        result = await user_client.post("/api/users", request.model_dump(mode="json"))
    except httpx.HTTPStatusError as e:
        detail = _extract_upstream_detail(e)
        raise HTTPException(status_code=e.response.status_code, detail=detail)
    except Exception as e:
        logger.error("User service unavailable: %s", e)
        raise HTTPException(status_code=502, detail="User service unavailable")
    return UserResponse(**result)


@router.put("/admin/users/{user_id}", response_model=UserResponse)
async def update_user_admin(
    user_id: int,
    user_data: UserUpdate,
    _current_user: TokenUser = Depends(get_current_user),
):
    try:
        result = await user_client.put(
            f"/api/users/{user_id}", user_data.model_dump(mode="json", exclude_none=True)
        )
    except httpx.HTTPStatusError as e:
        detail = _extract_upstream_detail(e)
        raise HTTPException(status_code=e.response.status_code, detail=detail)
    except Exception as e:
        logger.error("User service unavailable: %s", e)
        raise HTTPException(status_code=502, detail="User service unavailable")
    return UserResponse(**result)


@router.delete("/admin/users/{user_id}")
async def delete_user_admin(
    user_id: int,
    _current_user: TokenUser = Depends(get_current_user),
):
    if _current_user.id == user_id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta")

    try:
        await user_client.delete(f"/api/users/{user_id}")
    except httpx.HTTPStatusError as e:
        detail = _extract_upstream_detail(e)
        raise HTTPException(status_code=e.response.status_code, detail=detail)
    except Exception as e:
        logger.error("User service unavailable: %s", e)
        raise HTTPException(status_code=502, detail="User service unavailable")
    return {"message": "Usuario eliminado correctamente"}
