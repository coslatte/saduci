"""User schemas for authentication."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserBase(BaseModel):
    """Base user schema."""

    email: EmailStr
    username: str
    role: str = "MEDICO"  # Default role
    is_active: bool = True
    is_superuser: bool = False


class UserCreate(UserBase):
    """Schema for creating a user."""

    password: str


class RegisterRequest(BaseModel):
    """Schema for user registration."""

    email: EmailStr
    username: str
    password: str


class UserCreateRequest(BaseModel):
    """Schema for admin to create a user."""

    email: EmailStr
    username: str
    password: str
    is_superuser: bool = False
    is_active: bool = True


class UserUpdate(BaseModel):
    """Schema for updating a user."""

    model_config = ConfigDict(populate_by_name=True)

    email: EmailStr | None = None
    role: str | None = None
    is_active: bool | None = None


class UserResponse(UserBase):
    """Schema for user response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime

class RegisterResponse(BaseModel):
    """Schema for registration response."""

    message: str
    user: UserResponse
