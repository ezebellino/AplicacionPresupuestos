"""expand tenant logo url storage

Revision ID: 0012_expand_tenant_logo_url
Revises: 0011_membership_payment_quote_refs
Create Date: 2026-05-23 10:12:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0012_expand_tenant_logo_url"
down_revision: str | None = "0011_membership_payment_quote_refs"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("tenants") as batch_op:
        batch_op.alter_column(
            "logo_url",
            existing_type=sa.String(length=1000),
            type_=sa.Text(),
            existing_nullable=True,
        )


def downgrade() -> None:
    with op.batch_alter_table("tenants") as batch_op:
        batch_op.alter_column(
            "logo_url",
            existing_type=sa.Text(),
            type_=sa.String(length=1000),
            existing_nullable=True,
        )
