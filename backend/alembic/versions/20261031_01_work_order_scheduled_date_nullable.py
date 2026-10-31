"""Hacer nullable la columna scheduled_date en work_orders para visitas por coordinar.

Revision ID: 20261031_01
Revises: 20261026_01
Create Date: 2026-10-31 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20261031_01"
down_revision = "20261026_01"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column(
        "work_orders",
        "scheduled_date",
        existing_type=sa.DateTime(timezone=True),
        nullable=True,
    )


def downgrade():
    op.alter_column(
        "work_orders",
        "scheduled_date",
        existing_type=sa.DateTime(timezone=True),
        nullable=False,
    )
