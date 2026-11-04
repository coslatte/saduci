"""Patient business logic."""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession
from shared_core.exceptions import raise_not_found, raise_conflict

from app.repositories.patient_repository import (
    get_by_mrn as _get_by_mrn,
    create as _create,
    update as _update,
)
from app.models.patient import PatientRecord
from app.schemas import PatientCreate, PatientUpdate, PatientResponse


async def create_patient(db: AsyncSession, request: PatientCreate) -> PatientResponse:
    existing = await _get_by_mrn(db, request.mrn)
    if existing:
        raise_conflict("Ya existe un paciente con ese MRN")

    record = PatientRecord(
        mrn=request.mrn,
        first_name=request.first_name,
        last_name=request.last_name,
        date_of_birth=request.date_of_birth,
        sex=request.sex,
    )
    record = await _create(db, record)
    return PatientResponse.model_validate(record)


async def get_by_mrn(db: AsyncSession, mrn: str) -> PatientResponse:
    record = await _get_by_mrn(db, mrn)
    if record is None:
        raise_not_found("Patient")
    return PatientResponse.model_validate(record)


async def update(db: AsyncSession, mrn: str, request: PatientUpdate) -> PatientResponse:
    record = await _get_by_mrn(db, mrn)
    if record is None:
        raise_not_found("Patient")

    if request.first_name is not None:
        record.first_name = request.first_name
    if request.last_name is not None:
        record.last_name = request.last_name
    if request.date_of_birth is not None:
        record.date_of_birth = request.date_of_birth
    if request.sex is not None:
        record.sex = request.sex

    record = await _update(db, record)
    return PatientResponse.model_validate(record)
