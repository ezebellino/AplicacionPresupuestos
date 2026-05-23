"""add tenant change requests

Revision ID: 0006_tenant_change_requests
Revises: 0005_quote_public_share_token
Create Date: 2026-05-20 21:10:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0006_tenant_change_requests"
down_revision: str | None = "0005_quote_public_share_token"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "tenant_change_requests",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("requested_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("current_name", sa.String(length=255), nullable=True),
        sa.Column("current_legal_name", sa.String(length=255), nullable=True),
        sa.Column("current_tax_id", sa.String(length=64), nullable=True),
        sa.Column("proposed_name", sa.String(length=255), nullable=True),
        sa.Column("proposed_legal_name", sa.String(length=255), nullable=True),
        sa.Column("proposed_tax_id", sa.String(length=64), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_tenant_change_requests_tenant_id",
        "tenant_change_requests",
        ["tenant_id"],
        unique=False,
    )
    op.create_index(
        "ix_tenant_change_requests_requested_by_user_id",
        "tenant_change_requests",
        ["requested_by_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_tenant_change_requests_requested_by_user_id",
        table_name="tenant_change_requests",
    )
    op.drop_index(
        "ix_tenant_change_requests_tenant_id",
        table_name="tenant_change_requests",
    )
    op.drop_table("tenant_change_requests")
