"""client service records

Revision ID: 0002_client_service_records
Revises: 0001_initial_schema
Create Date: 2026-05-14 09:30:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa


revision: str = "0002_client_service_records"
down_revision: str | None = "0001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op = _op()
    op.create_table(
        "client_service_records",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("client_id", sa.Uuid(), nullable=False),
        sa.Column("performed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["client_id", "tenant_id"],
            ["clients.id", "clients.tenant_id"],
            name="fk_client_service_records_client_tenant",
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_client_service_records_tenant_id"),
        "client_service_records",
        ["tenant_id"],
        unique=False,
    )


def downgrade() -> None:
    op = _op()
    op.drop_index(
        op.f("ix_client_service_records_tenant_id"),
        table_name="client_service_records",
    )
    op.drop_table("client_service_records")


def _op():
    from alembic import op

    return op
