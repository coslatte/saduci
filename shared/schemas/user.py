"""User schemas for authentication."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


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
    
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
