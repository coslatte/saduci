"""Patient registry service."""
from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Date, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from shared.schemas import PatientCreate, PatientUpdate, PatientResponse, HealthCheck
from shared.utils import get_logger, initialize_database


logger = get_logger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./patient_service.db")
_is_sqlite = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class PatientRecord(Base):
    """Patient record persisted by the registry service."""

    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    mrn = Column(String(64), unique=True, index=True, nullable=False)
    first_name = Column(String(120), nullable=False)
    last_name = Column(String(120), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    sex = Column(String(32), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


@asynccontextmanager
async def lifespan(_app: FastAPI):
    initialize_database(Base, engine, logger, os.path.join(os.path.dirname(__file__), "migrations"))
    yield


app = FastAPI(
    title="Patient Service",
    description="Patient registry service",
    version="1.0.0",
    lifespan=lifespan,
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/health", response_model=HealthCheck)
async def health_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail="Patient database unavailable") from exc
    return HealthCheck(status="healthy", service="patient")


@app.post("/patients", response_model=PatientResponse)
async def create_patient(request: PatientCreate, db: Session = Depends(get_db)):
    existing = db.query(PatientRecord).filter(PatientRecord.mrn == request.mrn).first()
    if existing:
        raise HTTPException(status_code=400, detail="MRN already exists")

    record = PatientRecord(
        mrn=request.mrn,
        first_name=request.first_name,
        last_name=request.last_name,
        date_of_birth=request.date_of_birth,
        sex=request.sex,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return PatientResponse.model_validate(record)


@app.get("/patients/{mrn}", response_model=PatientResponse)
async def get_patient(mrn: str, db: Session = Depends(get_db)):
    record = db.query(PatientRecord).filter(PatientRecord.mrn == mrn).first()
    if record is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return PatientResponse.model_validate(record)


@app.put("/patients/{mrn}", response_model=PatientResponse)
async def update_patient(mrn: str, request: PatientUpdate, db: Session = Depends(get_db)):
    record = db.query(PatientRecord).filter(PatientRecord.mrn == mrn).first()
    if record is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    if request.first_name is not None:
        record.first_name = request.first_name
    if request.last_name is not None:
        record.last_name = request.last_name
    if request.date_of_birth is not None:
        record.date_of_birth = request.date_of_birth
    if request.sex is not None:
        record.sex = request.sex

    db.add(record)
    db.commit()
    db.refresh(record)
    return PatientResponse.model_validate(record)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port)
