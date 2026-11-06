"""Patient HTTP router with role-based access control."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.controllers.auth import get_current_user, require_especialista_or_admin

from app.models.database import get_db
from app.schemas import PatientCreate, PatientUpdate, PatientResponse
from app.services.patient_service import create_patient, get_by_mrn, update
from app.models.patient import PatientSkuSequence

router = APIRouter(tags=["patients"])


@router.post("/api/patients/next-sku")
async def reserve_next_patient_sku(
    _current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        update(PatientSkuSequence)
        .where(PatientSkuSequence.id == 1)
        .values(next_value=PatientSkuSequence.next_value + 1)
        .returning(PatientSkuSequence.next_value)
    )
    sequence_value = result.scalar_one() - 1
    await db.commit()
    return {"sku": f"PRED-{sequence_value:06d}"}


@router.post("/api/patients", response_model=PatientResponse)
async def create_patient_endpoint(
    request: PatientCreate,
    current_user = Depends(require_especialista_or_admin),
    db: AsyncSession = Depends(get_db),
):
    return await create_patient(db, request)


@router.get("/api/patients/{mrn}", response_model=PatientResponse)
async def get_patient_endpoint(
    mrn: str,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_by_mrn(db, mrn)


@router.put("/api/patients/{mrn}", response_model=PatientResponse)
async def update_patient_endpoint(
    mrn: str,
    request: PatientUpdate,
    current_user = Depends(require_especialista_or_admin),
    db: AsyncSession = Depends(get_db),
):
    return await update(db, mrn, request)
