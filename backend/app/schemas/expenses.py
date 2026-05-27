from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ExpenseCategoryCreate(BaseModel):
    name: str


class ExpenseCategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    is_active: bool


class ExpenseCategoryList(BaseModel):
    items: list[ExpenseCategoryRead]


class ExpenseEntryCreate(BaseModel):
    amount: Decimal
    detail: str
    notes: str | None = None
    status: str = "pending"
    client_id: UUID | None = None
    category_id: UUID | None = None


class ExpenseEntryUpdate(BaseModel):
    amount: Decimal | None = None
    detail: str | None = None
    notes: str | None = None
    status: str | None = None
    client_id: UUID | None = None
    category_id: UUID | None = None


class ExpenseEntryRead(BaseModel):
    id: UUID
    client_id: UUID | None
    client_name: str | None
    category_id: UUID | None
    category_name: str | None
    amount: Decimal
    detail: str
    notes: str | None
    status: str
    created_at: datetime


class ExpenseEntryList(BaseModel):
    items: list[ExpenseEntryRead]
