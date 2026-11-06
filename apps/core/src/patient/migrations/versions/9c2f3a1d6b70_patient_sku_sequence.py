"""Add an atomic sequence for patient SKUs.

Revision ID: 9c2f3a1d6b70
Revises: b50153ae8382
"""
from __future__ import annotations

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
    op.execute(
        sa.text(
            "INSERT INTO patient_sku_sequence (id, next_value) "
            "SELECT 1, COALESCE(MAX(id), 0) + 1 FROM patients"
        )
    )


def downgrade() -> None:
    op.drop_table("patient_sku_sequence")
