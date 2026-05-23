"""add public share token to quotes

Revision ID: 0005_quote_public_share_token
Revises: 0004_client_soft_delete
Create Date: 2026-05-19 22:10:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0005_quote_public_share_token"
down_revision: str | None = "0004_client_soft_delete"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("quotes", sa.Column("public_share_token", sa.String(length=96), nullable=True))
    op.create_index("ix_quotes_public_share_token", "quotes", ["public_share_token"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_quotes_public_share_token", table_name="quotes")
    op.drop_column("quotes", "public_share_token")
