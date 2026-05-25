"""add membership payment status fields

Revision ID: 0013_membership_payment_status
Revises: 0012_expand_tenant_logo_url
Create Date: 2026-05-25 17:35:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision: str = "0013_membership_payment_status"
down_revision: str | None = "0012_expand_tenant_logo_url"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("tenant_membership_payments") as batch_op:
        batch_op.add_column(
            sa.Column("status", sa.String(length=30), nullable=False, server_default="active")
        )
        batch_op.add_column(sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("cancelled_by_user_id", sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column("cancel_reason", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("tenant_membership_payments") as batch_op:
        batch_op.drop_column("cancel_reason")
        batch_op.drop_column("cancelled_by_user_id")
        batch_op.drop_column("cancelled_at")
        batch_op.drop_column("status")
