from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infra.models import Client, ExpenseCategory, ExpenseEntry
from app.schemas.expenses import (
    ExpenseCategoryCreate,
    ExpenseEntryCreate,
    ExpenseEntryRead,
    ExpenseEntryUpdate,
)


VALID_EXPENSE_STATUSES = {"pending", "paid"}


def list_expense_categories(db: Session, tenant_id: UUID) -> list[ExpenseCategory]:
    return list(
        db.scalars(
            select(ExpenseCategory)
            .where(ExpenseCategory.tenant_id == tenant_id, ExpenseCategory.is_active.is_(True))
            .order_by(ExpenseCategory.name, ExpenseCategory.id)
        )
    )


def create_expense_category(
    db: Session,
    tenant_id: UUID,
    payload: ExpenseCategoryCreate,
) -> ExpenseCategory:
    category = ExpenseCategory(
        tenant_id=tenant_id,
        name=payload.name.strip(),
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def deactivate_expense_category(db: Session, tenant_id: UUID, category_id: UUID) -> bool:
    category = db.scalar(
        select(ExpenseCategory).where(
            ExpenseCategory.tenant_id == tenant_id,
            ExpenseCategory.id == category_id,
            ExpenseCategory.is_active.is_(True),
        )
    )
    if category is None:
        return False

    category.is_active = False
    db.commit()
    return True


def _client_exists(db: Session, tenant_id: UUID, client_id: UUID) -> bool:
    return (
        db.scalar(
            select(Client.id).where(
                Client.tenant_id == tenant_id,
                Client.id == client_id,
                Client.is_active.is_(True),
            )
        )
        is not None
    )


def _category_exists(db: Session, tenant_id: UUID, category_id: UUID) -> bool:
    return (
        db.scalar(
            select(ExpenseCategory.id).where(
                ExpenseCategory.tenant_id == tenant_id,
                ExpenseCategory.id == category_id,
                ExpenseCategory.is_active.is_(True),
            )
        )
        is not None
    )


def list_expense_entries(db: Session, tenant_id: UUID) -> list[ExpenseEntry]:
    return list(
        db.scalars(
            select(ExpenseEntry)
            .where(ExpenseEntry.tenant_id == tenant_id)
            .order_by(ExpenseEntry.created_at.desc(), ExpenseEntry.id.desc())
        )
    )


def serialize_expense_entry(entry: ExpenseEntry) -> ExpenseEntryRead:
    return ExpenseEntryRead(
        id=entry.id,
        client_id=entry.client_id,
        client_name=entry.client.name if entry.client is not None else None,
        category_id=entry.category_id,
        category_name=entry.category.name if entry.category is not None else None,
        amount=entry.amount,
        detail=entry.detail,
        notes=entry.notes,
        status=entry.status,
        created_at=entry.created_at,
    )


def create_expense_entry(db: Session, tenant_id: UUID, payload: ExpenseEntryCreate) -> ExpenseEntry:
    if payload.status not in VALID_EXPENSE_STATUSES:
        raise ValueError("Invalid expense status")
    if payload.client_id is not None and not _client_exists(db, tenant_id, payload.client_id):
        raise LookupError("Client not found")
    if payload.category_id is not None and not _category_exists(db, tenant_id, payload.category_id):
        raise LookupError("Category not found")

    entry = ExpenseEntry(
        tenant_id=tenant_id,
        **payload.model_dump(),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def update_expense_entry(
    db: Session,
    tenant_id: UUID,
    expense_id: UUID,
    payload: ExpenseEntryUpdate,
) -> ExpenseEntry | None:
    entry = db.scalar(
        select(ExpenseEntry).where(
            ExpenseEntry.tenant_id == tenant_id,
            ExpenseEntry.id == expense_id,
        )
    )
    if entry is None:
        return None

    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] not in VALID_EXPENSE_STATUSES:
        raise ValueError("Invalid expense status")
    if "client_id" in data and data["client_id"] is not None and not _client_exists(db, tenant_id, data["client_id"]):
        raise LookupError("Client not found")
    if "category_id" in data and data["category_id"] is not None and not _category_exists(db, tenant_id, data["category_id"]):
        raise LookupError("Category not found")

    for field, value in data.items():
        setattr(entry, field, value)

    db.commit()
    db.refresh(entry)
    return entry
