"""Add an optional reminder date without changing existing quote statuses."""

from alembic import op
import sqlalchemy as sa

revision = "0016_quote_follow_up"
down_revision = "0015_audit_events"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("quotes", sa.Column("follow_up_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("quotes", "follow_up_at")
