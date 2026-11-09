"""Add an atomic sequence for patient SKUs.

Revision ID: 9c2f3a1d6b70
Revises: b50153ae8382
"""
from __future__ import annotations

import re
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9c2f3a1d6b70"
down_revision: Union[str, None] = "b50153ae8382"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "patient_sku_sequence",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("next_value", sa.Integer(), nullable=False),
    )
    patients = op.get_bind().execute(sa.text("SELECT id, mrn FROM patients")).all()
    highest_patient_id = max((patient.id for patient in patients), default=0)
    highest_numeric_sku = max(
        (
            int(match.group(1))
            for patient in patients
            if (match := re.fullmatch(r"PRED-(\d+)", patient.mrn))
        ),
        default=0,
    )
    op.execute(
        sa.text(
            "INSERT INTO patient_sku_sequence (id, next_value) "
            "VALUES (1, :next_value)"
        ).bindparams(next_value=max(highest_patient_id, highest_numeric_sku) + 1)
    )


def downgrade() -> None:
    op.drop_table("patient_sku_sequence")
