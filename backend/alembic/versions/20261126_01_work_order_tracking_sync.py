"""Agregar tracking_mode y simulation_started_at a work_orders para sincronizacion V2.

Revision ID: 20261126_01
Revises: 20261124_01
Create Date: 2026-11-26 10:20:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20261126_01"
down_revision = "20261124_01"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "work_orders",
        sa.Column(
            "tracking_mode",
            sa.String(length=20),
            server_default=sa.text("'AUTO'"),
            nullable=False,
        ),
    )
    op.add_column(
        "work_orders",
        sa.Column("simulation_started_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade():
    op.drop_column("work_orders", "simulation_started_at")
    op.drop_column("work_orders", "tracking_mode")
