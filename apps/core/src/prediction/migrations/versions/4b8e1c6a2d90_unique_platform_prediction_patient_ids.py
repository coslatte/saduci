"""Make generated platform prediction identifiers unique.

Revision ID: 4b8e1c6a2d90
Revises: 3a9c2f7d1e64
"""
from __future__ import annotations

import re

from alembic import op
import sqlalchemy as sa

revision = "4b8e1c6a2d90"
down_revision = "3a9c2f7d1e64"
branch_labels = None
depends_on = None


def upgrade() -> None:
    predictions = sa.table(
        "predictions",
        sa.column("id", sa.Integer),
        sa.column("patient_id", sa.String),
        sa.column("model_name", sa.String),
    )
    connection = op.get_bind()
    rows = connection.execute(
        sa.select(predictions.c.id, predictions.c.patient_id).where(
            predictions.c.model_name == "platform_mortality",
            predictions.c.patient_id.like("PRED-%"),
        )
    )

    for prediction_id, patient_id in rows:
        if re.fullmatch(r"PRED-\d+-\d+", patient_id):
            connection.execute(
                predictions.update()
                .where(predictions.c.id == prediction_id)
                .values(patient_id=f"PRED-{prediction_id:06d}")
            )


def downgrade() -> None:
    predictions = sa.table(
        "predictions",
        sa.column("id", sa.Integer),
        sa.column("patient_id", sa.String),
        sa.column("model_name", sa.String),
        sa.column("features", sa.JSON),
    )
    connection = op.get_bind()
    rows = connection.execute(
        sa.select(
            predictions.c.id,
            predictions.c.patient_id,
            predictions.c.features,
        ).where(
            predictions.c.model_name == "platform_mortality",
            predictions.c.patient_id.like("PRED-%"),
        )
    )

    for prediction_id, patient_id, features in rows:
        if not re.fullmatch(r"PRED-\d+", patient_id) or not isinstance(features, dict):
            continue
        age = features.get("edad")
        apache = features.get("apache")
        if isinstance(age, int) and isinstance(apache, int):
            connection.execute(
                predictions.update()
                .where(predictions.c.id == prediction_id)
                .values(patient_id=f"PRED-{age}-{apache}")
            )
