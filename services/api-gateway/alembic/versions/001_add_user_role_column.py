"""Add role column to users table.

Revision ID: 001
Revises: 
Create Date: 2026-04-28 14:21:22.966000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add role column to users table with MEDICO as default."""
    op.add_column('users', sa.Column('role', sa.String(50), nullable=False, server_default='MEDICO'))
    op.create_index(op.f('ix_users_role'), 'users', ['role'], unique=False)


def downgrade() -> None:
    """Remove role column from users table."""
    op.drop_index(op.f('ix_users_role'), table_name='users')
    op.drop_column('users', 'role')
