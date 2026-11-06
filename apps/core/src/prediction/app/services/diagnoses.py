"""Diagnosis catalog service."""
from sqlalchemy.orm import Session

from app.repositories.diagnoses import (
    list_diagnoses as fetch_diagnoses,
    list_respiratory_insufficiency_types as fetch_respiratory_types,
)


def list_diagnoses(db: Session):
    return fetch_diagnoses(db)


def list_respiratory_insufficiency_types(db: Session):
    return fetch_respiratory_types(db)
