"""Agregar campos de auditoría administrativa a work_orders.

Revision ID: 20261104_01
Revises: 20261031_01
Create Date: 2026-11-04 22:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20261104_01"
down_revision = "20261031_01"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "work_orders",
        sa.Column("is_audited", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.create_index(
        "ix_work_orders_is_audited",
        "work_orders",
        ["is_audited"],
        unique=False,
    )
    op.add_column(
        "work_orders",
        sa.Column("audited_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "work_orders",
        sa.Column(
            "audited_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "work_orders",
        sa.Column("audit_notes", sa.Text(), nullable=True),
    )


def downgrade():
    op.drop_column("work_orders", "audit_notes")
    op.drop_column("work_orders", "audited_by_user_id")
    op.drop_column("work_orders", "audited_at")
    op.drop_index("ix_work_orders_is_audited", table_name="work_orders")
    op.drop_column("work_orders", "is_audited")
