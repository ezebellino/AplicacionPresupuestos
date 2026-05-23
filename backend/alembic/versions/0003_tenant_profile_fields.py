"""tenant profile fields

Revision ID: 0003_tenant_profile_fields
Revises: 0002_client_service_records
Create Date: 2026-05-14 16:45:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa


revision: str = "0003_tenant_profile_fields"
down_revision: str | None = "0002_client_service_records"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op = _op()
    op.add_column("tenants", sa.Column("address", sa.String(length=500), nullable=True))
    op.add_column("tenants", sa.Column("phone", sa.String(length=100), nullable=True))
    op.add_column("tenants", sa.Column("email", sa.String(length=255), nullable=True))
    op.add_column("tenants", sa.Column("website", sa.String(length=255), nullable=True))
    op.add_column("tenants", sa.Column("logo_url", sa.String(length=1000), nullable=True))
    op.add_column("tenants", sa.Column("invoice_notes", sa.Text(), nullable=True))


def downgrade() -> None:
    op = _op()
    op.drop_column("tenants", "invoice_notes")
    op.drop_column("tenants", "logo_url")
    op.drop_column("tenants", "website")
    op.drop_column("tenants", "email")
    op.drop_column("tenants", "phone")
    op.drop_column("tenants", "address")


def _op():
    from alembic import op

    return op
