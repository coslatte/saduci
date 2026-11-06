"""Diagnosis catalog persistence."""
from sqlalchemy.orm import Session

from app.models.entities import Diagnosis, RespiratoryInsufficiencyType


def list_diagnoses(db: Session) -> list[Diagnosis]:
    return db.query(Diagnosis).order_by(Diagnosis.id).all()


def list_respiratory_insufficiency_types(db: Session) -> list[RespiratoryInsufficiencyType]:
    return db.query(RespiratoryInsufficiencyType).order_by(RespiratoryInsufficiencyType.id).all()
