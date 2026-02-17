"""Patient service - CRUD operations and clinical data import."""
import os
import sys
import csv
import io
import json
from typing import List
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from sqlalchemy import create_engine, Column, Integer, String, DateTime, JSON
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# Add shared modules to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from shared.schemas import HealthCheck, PatientCreate, PatientUpdate, PatientResponse
from shared.utils import get_logger

logger = get_logger(__name__)

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL must be configured")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Patient(Base):
    """Patient database model."""
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    date_of_birth = Column(DateTime, nullable=False)
    gender = Column(String, nullable=False)
    clinical_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, onupdate=lambda: datetime.now(timezone.utc))


# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Patient Service",
    description="Patient management service with CRUD and clinical data import",
    version="1.0.0"
)


def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint."""
    return HealthCheck(status="healthy", service="patient")


@app.get("/patients", response_model=List[PatientResponse])
async def list_patients(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List all patients."""
    patients = db.query(Patient).offset(skip).limit(limit).all()
    return patients


@app.post("/patients", response_model=PatientResponse, status_code=201)
async def create_patient(patient: PatientCreate, db: Session = Depends(get_db)):
    """Create a new patient."""
    # Check if patient_id already exists
    existing = db.query(Patient).filter(Patient.patient_id == patient.patient_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Patient ID already exists")

    db_patient = Patient(**patient.model_dump())
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)

    logger.info("Created patient: %s", db_patient.patient_id)
    return db_patient


@app.get("/patients/{patient_id}", response_model=PatientResponse)
async def get_patient(patient_id: str, db: Session = Depends(get_db)):
    """Get a patient by ID."""
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    return patient


@app.put("/patients/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: str,
    patient_update: PatientUpdate,
    db: Session = Depends(get_db)
):
    """Update a patient."""
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    update_data = patient_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(patient, field, value)

    patient.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(patient)

    logger.info("Updated patient: %s", patient_id)
    return patient


@app.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str, db: Session = Depends(get_db)):
    """Delete a patient."""
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    db.delete(patient)
    db.commit()

    logger.info("Deleted patient: %s", patient_id)
    return {"message": "Patient deleted successfully"}


@app.post("/patients/import")
async def import_clinical_data(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Import clinical data from CSV file.

    Expected CSV format:
    patient_id,first_name,last_name,date_of_birth,gender,clinical_data
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    content = await file.read()
    csv_file = io.StringIO(content.decode('utf-8'))
    csv_reader = csv.DictReader(csv_file)

    imported_count = 0
    errors = []

    for row in csv_reader:
        try:
            # Parse date of birth
            dob = datetime.strptime(row['date_of_birth'], '%Y-%m-%d')

            # Parse clinical data if present
            clinical_data = None
            if 'clinical_data' in row and row['clinical_data']:
                clinical_data = json.loads(row['clinical_data'])

            patient = Patient(
                patient_id=row['patient_id'],
                first_name=row['first_name'],
                last_name=row['last_name'],
                date_of_birth=dob,
                gender=row['gender'],
                clinical_data=clinical_data
            )

            db.add(patient)
            imported_count += 1
        except (ValueError, KeyError, json.JSONDecodeError) as e:
            errors.append(f"Row {csv_reader.line_num}: {str(e)}")

    try:
        db.commit()
        logger.info("Imported %s patients", imported_count)
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to import data: {str(e)}") from e

    return {
        "message": f"Successfully imported {imported_count} patients",
        "imported": imported_count,
        "errors": errors
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port)
