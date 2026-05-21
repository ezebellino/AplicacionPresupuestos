"""add signup request account links

Revision ID: 0008_signup_request_account_links
Revises: 0007_tenant_signup_requests
Create Date: 2026-05-21 09:15:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0008_signup_request_account_links"
down_revision: str | None = "0007_tenant_signup_requests"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("tenant_signup_requests") as batch_op:
        batch_op.add_column(sa.Column("created_tenant_id", sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column("created_admin_email", sa.String(length=255), nullable=True))
        batch_op.create_foreign_key(
            "fk_tenant_signup_requests_created_tenant",
            "tenants",
            ["created_tenant_id"],
            ["id"],
        )


def downgrade() -> None:
    with op.batch_alter_table("tenant_signup_requests") as batch_op:
        batch_op.drop_constraint(
            "fk_tenant_signup_requests_created_tenant",
            type_="foreignkey",
        )
        batch_op.drop_column("created_admin_email")
        batch_op.drop_column("created_tenant_id")
