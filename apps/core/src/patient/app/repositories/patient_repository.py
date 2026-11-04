"""Patient repository: CRUD operations using AsyncSession."""
from __future__ import annotations

from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.patient import PatientRecord


async def get_by_mrn(db: AsyncSession, mrn: str) -> Optional[PatientRecord]:
    result = await db.execute(select(PatientRecord).filter(PatientRecord.mrn == mrn))
    return result.scalar_one_or_none()


async def create(db: AsyncSession, record: PatientRecord) -> PatientRecord:
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


async def update(db: AsyncSession, record: PatientRecord) -> PatientRecord:
    await db.commit()
    await db.refresh(record)
    return record
