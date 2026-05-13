from datetime import datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain.enums import CostCategory, QuoteStatus


Money = Annotated[Decimal, Field(ge=0, max_digits=12, decimal_places=2)]
Quantity = Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=2)]
TaxRate = Annotated[Decimal, Field(ge=0, le=100, max_digits=5, decimal_places=2)]


class QuoteCreate(BaseModel):
    client_id: UUID
    title: str | None = None
    notes: str | None = None
    valid_until: datetime | None = None


class QuoteUpdate(BaseModel):
    client_id: UUID | None = None
    title: str | None = None
    notes: str | None = None
    valid_until: datetime | None = None


class QuoteItemCreate(BaseModel):
    source_cost_item_id: UUID
    quantity: Quantity
    discount_amount: Money = Decimal("0.00")


class QuoteItemUpdate(BaseModel):
    category: CostCategory | None = None
    name: str | None = None
    description: str | None = None
    unit: str | None = None
    quantity: Quantity | None = None
    unit_price: Money | None = None
    tax_rate: TaxRate | None = None
    discount_amount: Money | None = None
    position: int | None = Field(default=None, ge=1)


class QuoteItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    source_cost_item_id: UUID | None
    category: CostCategory
    name: str
    description: str | None
    unit: str
    quantity: Decimal
    unit_price: Decimal
    tax_rate: Decimal
    discount_amount: Decimal
    line_subtotal: Decimal
    line_tax: Decimal
    line_total: Decimal
    position: int


class QuoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    client_id: UUID
    number: str
    status: QuoteStatus
    title: str | None
    notes: str | None
    valid_until: datetime | None
    subtotal: Decimal
    discount_total: Decimal
    tax_total: Decimal
    total: Decimal
    issued_at: datetime | None
    items: list[QuoteItemRead]


class QuoteList(BaseModel):
    items: list[QuoteRead]
