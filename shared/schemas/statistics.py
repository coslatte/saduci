"""Statistical test schemas."""
from typing import List

from pydantic import BaseModel, Field


class WilcoxonRequest(BaseModel):
    """Request schema for Wilcoxon signed-rank test."""

    x: List[float] = Field(..., description="First sample data")
    y: List[float] = Field(..., description="Second sample data")


class FriedmanRequest(BaseModel):
    """Request schema for Friedman chi-square test."""

    samples: List[List[float]] = Field(..., description="List of sample arrays")


class StatisticalTestResult(BaseModel):
    """Response schema for statistical tests."""

    statistic: float
    p_value: float
