"""Statistical test business logic."""
from __future__ import annotations

from typing import Any, Dict

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.services.notify import _notify_gateway
from app.models.entities import StatisticalTestRecord
from shared_core.exceptions import raise_not_found
from shared_core.schemas import (
    FriedmanRequest,
    StatisticalTestCreate,
    StatisticalTestUpdate,
    WilcoxonRequest,
)
from shared_core.utils import get_logger

logger = get_logger(__name__)

try:
    from scipy import stats as scipy_stats

    SCIPY_AVAILABLE = True
except ImportError:
    scipy_stats = None  # type: ignore[assignment]
    SCIPY_AVAILABLE = False


def _interpret_test(p_value: float, alpha: float = 0.05) -> str:
    """Return a human-readable interpretation of a statistical test result."""
    if p_value < alpha:
        return (
            f"Diferencia estadísticamente significativa "
            f"(p={p_value:.4f} < {alpha}). Se rechaza la hipótesis nula."
        )
    return (
        f"Sin diferencia estadísticamente significativa "
        f"(p={p_value:.4f} ≥ {alpha}). No se rechaza la hipótesis nula."
    )


async def run_wilcoxon_test(
    db: Session,
    request: WilcoxonRequest,
    x_user_id: int | None,
    x_user_username: str | None,
) -> Dict[str, Any]:
    """Run a Wilcoxon signed-rank test on two paired samples."""
    if not SCIPY_AVAILABLE:
        raise HTTPException(status_code=503, detail="scipy is not installed; cannot run statistical tests.")

    if len(request.x) != len(request.y):
        raise HTTPException(status_code=400, detail="Samples x and y must have the same length.")
    if len(request.x) < 2:
        raise HTTPException(status_code=400, detail="Each sample must contain at least 2 observations.")

    try:
        result = scipy_stats.wilcoxon(request.x, request.y)
    except Exception as exc:
        logger.error("Wilcoxon test error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Statistical test failed: {exc}") from exc

    statistic = float(result.statistic)
    p_value = float(result.pvalue)
    variable = request.variable if hasattr(request, "variable") and request.variable else "comparación de muestras"

    record = StatisticalTestRecord(
        test_type="wilcoxon",
        variable=variable,
        statistic=str(statistic),
        p_value=str(p_value),
        interpretation=_interpret_test(p_value),
        user_id=x_user_id,
        created_by=x_user_username,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    await _notify_gateway("statistical_test_created")

    return {
        "id": str(record.id),
        "test_type": record.test_type,
        "variable": record.variable,
        "statistic": statistic,
        "p_value": p_value,
        "interpretation": record.interpretation,
        "user_id": record.user_id,
        "created_by": record.created_by,
        "created_at": record.created_at.isoformat(),
    }


async def run_friedman_test(
    db: Session,
    request: FriedmanRequest,
    x_user_id: int | None,
    x_user_username: str | None,
) -> Dict[str, Any]:
    """Run a Friedman chi-square test across multiple related samples."""
    if not SCIPY_AVAILABLE:
        raise HTTPException(status_code=503, detail="scipy is not installed; cannot run statistical tests.")

    if len(request.samples) < 3:
        raise HTTPException(status_code=400, detail="Friedman test requires at least 3 sample groups.")

    lengths = [len(s) for s in request.samples]
    if len(set(lengths)) != 1:
        raise HTTPException(status_code=400, detail="All sample groups must have the same length.")
    if lengths[0] < 2:
        raise HTTPException(status_code=400, detail="Each sample group must contain at least 2 observations.")

    try:
        result = scipy_stats.friedmanchisquare(*request.samples)
    except Exception as exc:
        logger.error("Friedman test error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Statistical test failed: {exc}") from exc

    statistic = float(result.statistic)
    p_value = float(result.pvalue)
    variable = request.variable if hasattr(request, "variable") and request.variable else "comparación de grupos"

    record = StatisticalTestRecord(
        test_type="friedman",
        variable=variable,
        statistic=str(statistic),
        p_value=str(p_value),
        interpretation=_interpret_test(p_value),
        user_id=x_user_id,
        created_by=x_user_username,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    await _notify_gateway("statistical_test_created")

    return {
        "id": str(record.id),
        "test_type": record.test_type,
        "variable": record.variable,
        "statistic": statistic,
        "p_value": p_value,
        "interpretation": record.interpretation,
        "user_id": record.user_id,
        "created_by": record.created_by,
        "created_at": record.created_at.isoformat(),
    }


async def create_statistical_test_record(
    db: Session,
    payload: StatisticalTestCreate,
    x_user_id: int | None,
    x_user_username: str | None,
) -> Dict[str, Any]:
    """Create a new statistical test record."""
    record = StatisticalTestRecord(
        test_type=payload.test_type,
        variable=payload.variable,
        statistic=str(payload.statistic),
        p_value=str(payload.p_value),
        interpretation=payload.interpretation,
        user_id=x_user_id,
        created_by=x_user_username,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    await _notify_gateway("statistical_test_created")

    return {
        "id": str(record.id),
        "test_type": record.test_type,
        "variable": record.variable,
        "statistic": record.statistic,
        "p_value": record.p_value,
        "interpretation": record.interpretation,
        "user_id": record.user_id,
        "created_by": record.created_by,
        "created_at": record.created_at.isoformat(),
    }


def list_statistical_test_records(
    db: Session, skip: int = 0, limit: int = 100
) -> Dict[str, Any]:
    """Get all statistical test records."""
    records = (
        db.query(StatisticalTestRecord)
        .order_by(StatisticalTestRecord.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {
        "items": [
            {
                "id": str(r.id),
                "test_type": r.test_type,
                "variable": r.variable,
                "statistic": r.statistic,
                "p_value": r.p_value,
                "interpretation": r.interpretation,
                "user_id": r.user_id,
                "created_by": r.created_by,
                "created_at": r.created_at.isoformat(),
            }
            for r in records
        ],
        "total": db.query(StatisticalTestRecord).count(),
        "skip": skip,
        "limit": limit,
    }


def update_statistical_test(
    db: Session, test_id: int, payload: StatisticalTestUpdate
) -> Dict[str, Any]:
    """Update fields on an existing statistical test record."""
    record = db.get(StatisticalTestRecord, test_id)
    if not record:
        raise_not_found("Prueba estadística")

    fields = payload.model_dump(exclude_unset=True)
    if "test_type" in fields:
        record.test_type = fields["test_type"]
    if "variable" in fields:
        record.variable = fields["variable"]
    if "statistic" in fields:
        record.statistic = str(fields["statistic"])
    if "p_value" in fields:
        record.p_value = str(fields["p_value"])
    if "interpretation" in fields:
        record.interpretation = fields["interpretation"]

    db.add(record)
    db.commit()
    db.refresh(record)
    return {
        "id": str(record.id),
        "test_type": record.test_type,
        "variable": record.variable,
        "statistic": record.statistic,
        "p_value": record.p_value,
        "interpretation": record.interpretation,
        "user_id": record.user_id,
        "created_by": record.created_by,
        "created_at": record.created_at.isoformat(),
    }
