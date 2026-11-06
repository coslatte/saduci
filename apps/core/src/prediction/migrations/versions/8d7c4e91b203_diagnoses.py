"""Create the clinical diagnosis catalog.

Revision ID: 8d7c4e91b203
Revises: 0a8d5469c05f
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "8d7c4e91b203"
down_revision = "0a8d5469c05f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    diagnoses = op.create_table(
        "diagnoses",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(), nullable=False),
    )
    op.bulk_insert(diagnoses, [
        {"id": 0, "name": 'Vacío'},
        {"id": 1, "name": 'Intoxicación exógena'},
        {"id": 2, "name": 'Coma'},
        {"id": 3, "name": 'Trauma craneoencefálico severo'},
        {"id": 4, "name": 'SPO de toracotomía'},
        {"id": 5, "name": 'SPO de laparotomía'},
        {"id": 6, "name": 'SPO de amputación'},
        {"id": 7, "name": 'SPO de neurología'},
        {"id": 8, "name": 'PCR recuperado'},
        {"id": 9, "name": 'Encefalopatía metabólica'},
        {"id": 10, "name": 'Encefalopatía hipóxica'},
        {"id": 11, "name": 'Ahorcamiento incompleto'},
        {"id": 12, "name": 'Insuficiencia cardiaca descompensada'},
        {"id": 13, "name": 'Obstétrica grave'},
        {"id": 14, "name": 'EPOC descompensada'},
        {"id": 15, "name": 'ARDS'},
        {"id": 16, "name": 'BNB-EH'},
        {"id": 17, "name": 'BNB-IH'},
        {"id": 18, "name": 'BNV'},
        {"id": 19, "name": 'Miocarditis'},
        {"id": 20, "name": 'Leptospirosis'},
        {"id": 21, "name": 'Sepsis grave'},
        {"id": 22, "name": 'DMO'},
        {"id": 23, "name": 'Shock séptico'},
        {"id": 24, "name": 'Shock hipovolémico'},
        {"id": 25, "name": 'Shock cardiogénico'},
        {"id": 26, "name": 'IMA'},
        {"id": 27, "name": 'Politraumatizado'},
        {"id": 28, "name": 'Crisis miasténica'},
        {"id": 29, "name": 'Emergencia hipertensiva'},
        {"id": 30, "name": 'Status asmático'},
        {"id": 31, "name": 'Status epiléptico'},
        {"id": 32, "name": 'Pancreatitis'},
        {"id": 33, "name": 'Embolismo graso'},
        {"id": 34, "name": 'Accidente cerebrovascular'},
        {"id": 35, "name": 'Síndrome de apnea del sueño'},
        {"id": 36, "name": 'Sangramiento digestivo'},
        {"id": 37, "name": 'Insuficiencia renal crónica'},
        {"id": 38, "name": 'Insuficiencia renal aguda'},
        {"id": 39, "name": 'Trasplante renal'},
        {"id": 40, "name": 'Guillain Barré'},
    ])
    if op.get_bind().dialect.name == "postgresql":
        op.execute("SELECT setval(pg_get_serial_sequence('diagnoses', 'id'), "
                   "(SELECT MAX(id) FROM diagnoses))")


def downgrade() -> None:
    op.drop_table("diagnoses")
