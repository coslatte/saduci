from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    ESPECIALISTA = "ESPECIALISTA"
    MEDICO = "MEDICO"


class UserBase(BaseModel):
    email: EmailStr
    username: str
    role: UserRole = UserRole.MEDICO
    is_active: bool = True
    avatar: str | None = None


class UserCreate(UserBase):
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str


class UserUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    username: str | None = None
    email: EmailStr | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    avatar: str | None = None


class PasswordChangeRequest(BaseModel):
    """Acepta camelCase (frontend) y snake_case (servicios internos)."""

    model_config = ConfigDict(populate_by_name=True)

    current_password: str = Field(alias="currentPassword")
    new_password: str = Field(alias="newPassword", min_length=8)


class TokenUser(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    is_superuser: bool


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_superuser: bool = False
    created_at: datetime
    updated_at: datetime


class RegisterResponse(BaseModel):
    message: str
    user: UserResponse
