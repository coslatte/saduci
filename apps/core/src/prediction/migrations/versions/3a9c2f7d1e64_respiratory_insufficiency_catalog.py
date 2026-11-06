"""Create the respiratory insufficiency catalog.

Revision ID: 3a9c2f7d1e64
Revises: 8d7c4e91b203
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "3a9c2f7d1e64"
down_revision = "8d7c4e91b203"
branch_labels = None
depends_on = None


def upgrade() -> None:
    catalog = op.create_table(
        "respiratory_insufficiency_types",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
    )
    op.bulk_insert(
        catalog,
        [
            {"id": 0, "name": "Vacío"},
            {"id": 1, "name": "Respiratorias"},
            {"id": 2, "name": "TCE"},
            {"id": 3, "name": "Estatus posoperatorio"},
            {"id": 4, "name": "Afecciones no traumáticas del SNC"},
            {"id": 5, "name": "Causas extrapulmonares"},
        ],
    )


def downgrade() -> None:
    op.drop_table("respiratory_insufficiency_types")
