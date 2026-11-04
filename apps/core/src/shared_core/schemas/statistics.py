from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field


class WilcoxonRequest(BaseModel):
    x: List[float] = Field(..., description="First sample data")
    y: List[float] = Field(..., description="Second sample data")
    variable: str | None = Field(default=None, description="Human-readable label for the comparison")


class FriedmanRequest(BaseModel):
    samples: List[List[float]] = Field(..., description="List of sample arrays")
    variable: str | None = Field(default=None, description="Human-readable label for the comparison")


class StatisticalTestCreate(BaseModel):
    """Registro manual de una prueba estadística ya calculada."""

    test_type: str = "wilcoxon"
    variable: str = ""
    statistic: float | str = 0
    p_value: float | str = 0
    interpretation: str = ""


class StatisticalTestUpdate(BaseModel):
    test_type: str | None = None
    variable: str | None = None
    statistic: float | str | None = None
    p_value: float | str | None = None
    interpretation: str | None = None
