"""add quote refs to membership payments

Revision ID: 0011_membership_payment_quote_refs
Revises: 0010_tenant_membership_payments
Create Date: 2026-05-21 17:10:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0011_membership_payment_quote_refs"
down_revision: str | None = "0010_tenant_membership_payments"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("tenant_membership_payments", sa.Column("quote_id", sa.Uuid(), nullable=True))
    op.add_column("tenant_membership_payments", sa.Column("quote_number", sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column("tenant_membership_payments", "quote_number")
    op.drop_column("tenant_membership_payments", "quote_id")
