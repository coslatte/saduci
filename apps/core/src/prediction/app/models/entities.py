"""Prediction ORM entity."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, Float, Integer, String

from shared_core.database import Base


class PredictionRecord(Base):
    """Prediction database model."""

    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, index=True, nullable=False)
    model_name = Column(String, nullable=False)
    features = Column(JSON, nullable=False)
    prediction = Column(JSON, nullable=False)
    confidence = Column(Float, nullable=True)
    user_id = Column(Integer, nullable=True, index=True)
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Diagnosis(Base):
    """Clinical diagnosis catalog entry."""

    __tablename__ = "diagnoses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)


class RespiratoryInsufficiencyType(Base):
    __tablename__ = "respiratory_insufficiency_types"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
