"""client soft delete

Revision ID: 0004_client_soft_delete
Revises: 0003_tenant_profile_fields
Create Date: 2026-05-19 20:10:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa


revision: str = "0004_client_soft_delete"
down_revision: str | None = "0003_tenant_profile_fields"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op = _op()
    op.add_column(
        "clients",
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
    )


def downgrade() -> None:
    op = _op()
    op.drop_column("clients", "is_active")


def _op():
    from alembic import op

    return op
