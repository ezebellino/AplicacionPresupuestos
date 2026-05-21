"""add tenant memberships

Revision ID: 0009_tenant_memberships
Revises: 0008_signup_request_account_links
Create Date: 2026-05-21 10:20:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0009_tenant_memberships"
down_revision: str | None = "0008_signup_request_account_links"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("tenants") as batch_op:
        batch_op.add_column(
            sa.Column("membership_status", sa.String(length=30), nullable=False, server_default="active")
        )
        batch_op.add_column(sa.Column("membership_due_date", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("membership_last_payment_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("membership_monthly_fee", sa.Numeric(12, 2), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("tenants") as batch_op:
        batch_op.drop_column("membership_monthly_fee")
        batch_op.drop_column("membership_last_payment_at")
        batch_op.drop_column("membership_due_date")
        batch_op.drop_column("membership_status")
