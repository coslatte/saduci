from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from shared_core.schemas import UserRole, TokenUser
from shared_core.security import verify_token

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
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    role_str = payload.get("role", "MEDICO")
    try:
        role = UserRole(role_str)
    except ValueError:
        role = UserRole.MEDICO
    return TokenUser(
        id=int(user_id), username=payload.get("sub", ""), email=payload.get("email", ""),
        role=role, is_superuser=payload.get("is_superuser", False),
    )


def require_especialista_or_admin(current_user: TokenUser = Depends(get_current_user)) -> TokenUser:
    if current_user.role not in (UserRole.ADMIN, UserRole.ESPECIALISTA):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para realizar esta acción")
    return current_user
