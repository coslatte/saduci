"""User schemas for authentication."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserBase(BaseModel):
    """Base user schema."""

    email: EmailStr
    username: str
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


class RegisterResponse(BaseModel):
    """Schema for registration response."""

    message: str
    user: UserResponse


class UserCreateRequest(BaseModel):
    """Schema for admin to create a user."""

    email: EmailStr
    username: str
    password: str
    is_superuser: bool = False
    is_active: bool = True


class UserResponse(UserBase):
    """Schema for user response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
