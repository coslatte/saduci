"""Baseline the prediction database schema created by SQLAlchemy metadata."""
revision = "0001_prediction_baseline"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    pass

def downgrade():
    raise RuntimeError("The baseline revision cannot be downgraded safely")
