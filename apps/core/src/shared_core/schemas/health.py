from pydantic import BaseModel


class HealthCheck(BaseModel):
    status: str
    service: str = "unknown"
    version: str = "1.0.0"
