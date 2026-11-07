"""Agregar columna last_location_at a tabla technicians.

Revision ID: 20261105_01
Revises: 20261104_01
Create Date: 2026-11-05 22:30:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20261105_01"
down_revision = "20261104_01"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "technicians",
        sa.Column("last_location_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade():
    op.drop_column("technicians", "last_location_at")
