"""Patient service proxy routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.controllers.auth import get_current_user, require_especialista_or_admin, _user_auth_headers
from app.controllers.config import logger, patient_client
from app.controllers.proxy import _translate_upstream_error
from app.schemas.auth import TokenUser

router = APIRouter(tags=["patients"])


@router.post("/api/patients")
async def create_patient(
    patient_data: dict,
    current_user: TokenUser = Depends(require_especialista_or_admin),
):
    try:
        return await patient_client.post(
            "/api/patients", patient_data, headers=_user_auth_headers(current_user)
        )
    except Exception as e:
        logger.error("Error forwarding patient creation: %s", e)
        raise _translate_upstream_error(e, "Patient service unavailable") from e


@router.get("/api/patients/{mrn}")
async def get_patient(mrn: str, _current_user: TokenUser = Depends(get_current_user)):
    try:
        return await patient_client.get(f"/api/patients/{mrn}")
    except Exception as e:
        logger.error("Error forwarding patient lookup: %s", e)
        raise _translate_upstream_error(e, "Patient service unavailable") from e


@router.put("/api/patients/{mrn}")
async def update_patient(
    mrn: str,
    patient_data: dict,
    current_user: TokenUser = Depends(require_especialista_or_admin),
):
    try:
        return await patient_client.put(
            f"/api/patients/{mrn}", patient_data, headers=_user_auth_headers(current_user)
        )
    except Exception as e:
        logger.error("Error forwarding patient update: %s", e)
        raise _translate_upstream_error(e, "Patient service unavailable") from e
