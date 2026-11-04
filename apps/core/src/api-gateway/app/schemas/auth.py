"""Auth schemas specific to the API Gateway."""
from __future__ import annotations

from pydantic import BaseModel

from shared_core.schemas import UserResponse, UserRole


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenUser(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    is_superuser: bool
