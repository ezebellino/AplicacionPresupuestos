"""add tenant expenses and categories

Revision ID: 0014_tenant_expenses
Revises: 0013_membership_payment_status
Create Date: 2026-05-27 11:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision: str = "0014_tenant_expenses"
down_revision: str | None = "0013_membership_payment_status"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "expense_categories",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id", "tenant_id", name="uq_expense_categories_id_tenant_id"),
    )
    op.create_index(op.f("ix_expense_categories_tenant_id"), "expense_categories", ["tenant_id"], unique=False)

    op.create_table(
        "expense_entries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("client_id", sa.Uuid(), nullable=True),
        sa.Column("category_id", sa.Uuid(), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("detail", sa.String(length=255), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(
            ["client_id", "tenant_id"],
            ["clients.id", "clients.tenant_id"],
            name="fk_expense_entries_client_tenant",
        ),
        sa.ForeignKeyConstraint(
            ["category_id", "tenant_id"],
            ["expense_categories.id", "expense_categories.tenant_id"],
            name="fk_expense_entries_category_tenant",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_expense_entries_tenant_id"), "expense_entries", ["tenant_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_expense_entries_tenant_id"), table_name="expense_entries")
    op.drop_table("expense_entries")
    op.drop_index(op.f("ix_expense_categories_tenant_id"), table_name="expense_categories")
    op.drop_table("expense_categories")
