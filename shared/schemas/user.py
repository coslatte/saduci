"""User schemas for authentication."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserBase(BaseModel):
    """Base user schema."""

    email: EmailStr
    username: str
    is_active: bool = True


class UserCreate(UserBase):
    """Schema for creating a user."""

    password: str


class UserResponse(UserBase):
    """Schema for user response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
