"""Database engine and session for the prediction service."""
from __future__ import annotations

from typing import Generator

from sqlalchemy.orm import Session

from shared_core.database import Base, SessionLocal, engine


def get_db() -> Generator[Session, None, None]:
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


__all__ = ["Base", "SessionLocal", "engine", "get_db"]
