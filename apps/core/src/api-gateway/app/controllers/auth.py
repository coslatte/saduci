"""Auth dependencies and user header helpers for the API Gateway."""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from shared_core.schemas import UserRole
from shared_core.security import verify_token
from app.schemas.auth import TokenUser

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> TokenUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("uid")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    role_str = payload.get("role", "MEDICO")
    try:
        role = UserRole(role_str)
    except ValueError:
        role = UserRole.MEDICO

    return TokenUser(
        id=int(user_id),
        username=payload.get("sub", ""),
        email=payload.get("email", ""),
        role=role,
        is_superuser=payload.get("is_superuser", False),
    )


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> TokenUser | None:
    if credentials is None or credentials.scheme.lower() != "bearer":
        return None

    payload = verify_token(credentials.credentials)
    if payload is None:
        return None

    user_id = payload.get("uid")
    if user_id is None:
        return None

    role_str = payload.get("role", "MEDICO")
    try:
        role = UserRole(role_str)
    except ValueError:
        role = UserRole.MEDICO

    return TokenUser(
        id=int(user_id),
        username=payload.get("sub", ""),
        email=payload.get("email", ""),
        role=role,
        is_superuser=payload.get("is_superuser", False),
    )


def require_admin(current_user: TokenUser = Depends(get_current_user)) -> TokenUser:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can perform this action",
        )
    return current_user


def require_superuser(current_user: TokenUser = Depends(get_current_user)) -> TokenUser:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere permisos de administrador",
        )
    return current_user


def require_especialista_or_admin(
    current_user: TokenUser = Depends(get_current_user),
) -> TokenUser:
    if current_user.role not in (UserRole.ADMIN, UserRole.ESPECIALISTA):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para realizar esta acción",
        )
    return current_user


def _user_auth_headers(current_user: TokenUser) -> dict[str, str]:
    return {
        "X-User-ID": str(current_user.id),
        "X-User-Role": current_user.role.value,
        "X-User-Username": current_user.username,
    }


def _optional_user_headers(current_user: TokenUser | None) -> dict[str, str]:
    return _user_auth_headers(current_user) if current_user is not None else {}
