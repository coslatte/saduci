"""Initial migration for patient service

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'patients',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('patient_id', sa.String(), nullable=False),
        sa.Column('first_name', sa.String(), nullable=False),
        sa.Column('last_name', sa.String(), nullable=False),
        sa.Column('date_of_birth', sa.DateTime(), nullable=False),
        sa.Column('gender', sa.String(), nullable=False),
        sa.Column('clinical_data', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_patients_id'), 'patients', ['id'], unique=False)
    op.create_index(op.f('ix_patients_patient_id'), 'patients', ['patient_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_patients_patient_id'), table_name='patients')
    op.drop_index(op.f('ix_patients_id'), table_name='patients')
    op.drop_table('patients')
