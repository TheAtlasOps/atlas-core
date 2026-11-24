"""Agregar columnas client_type y secondary_phone a tabla clients.

Revision ID: 20261124_01
Revises: 20261105_01
Create Date: 2026-11-24 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20261124_01"
down_revision = "20261105_01"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "clients",
        sa.Column(
            "client_type",
            sa.String(length=20),
            server_default=sa.text("'EMPRESARIAL'"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_clients_client_type",
        "clients",
        ["client_type"],
        unique=False,
    )
    op.add_column(
        "clients",
        sa.Column("secondary_phone", sa.String(length=50), nullable=True),
    )


def downgrade():
    op.drop_column("clients", "secondary_phone")
    op.drop_index("ix_clients_client_type", table_name="clients")
    op.drop_column("clients", "client_type")
