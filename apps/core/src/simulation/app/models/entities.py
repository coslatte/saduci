"""ORM entities for the simulation service."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, Integer, String

from shared_core.database import Base


class SimulationRecord(Base):
    """Simulation database model."""

    __tablename__ = "simulations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, index=True, nullable=False)
    scenario = Column(String, nullable=False)
    parameters = Column(JSON, nullable=False)
    results = Column(JSON, nullable=False)
    user_id = Column(Integer, nullable=True, index=True)
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class StatisticalTestRecord(Base):
    """Statistical test result database model."""

    __tablename__ = "statistical_tests"

    id = Column(Integer, primary_key=True, index=True)
    test_type = Column(String, nullable=False, index=True)
    variable = Column(String, nullable=False)
    statistic = Column(String, nullable=False)
    p_value = Column(String, nullable=False)
    interpretation = Column(String, nullable=True)
    user_id = Column(Integer, nullable=True, index=True)
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
