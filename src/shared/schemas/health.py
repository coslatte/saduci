"""Health check schema."""
from pydantic import BaseModel


class HealthCheck(BaseModel):
    """Health check response model."""

    status: str
    service: str = "unknown"
    version: str = "1.0.0"
