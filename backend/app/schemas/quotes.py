from datetime import datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

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

    @field_validator("client_id", mode="before")
    @classmethod
    def client_id_cannot_be_null(cls, value):
        if value is None:
            raise ValueError("client_id cannot be null")

        return value


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

    @field_validator(
        "category",
        "name",
        "unit",
        "quantity",
        "unit_price",
        "tax_rate",
        "discount_amount",
        "position",
        mode="before",
    )
    @classmethod
    def required_fields_cannot_be_null(cls, value):
        if value is None:
            raise ValueError("field cannot be null")

        return value


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
    created_at: datetime
    subtotal: Decimal
    discount_total: Decimal
    tax_total: Decimal
    total: Decimal
    issued_at: datetime | None
    items: list[QuoteItemRead]


class QuoteList(BaseModel):
    items: list[QuoteRead]


class QuoteShareLinkRead(BaseModel):
    token: str
    url: str


class QuoteBulkDelete(BaseModel):
    quote_ids: list[UUID] = Field(min_length=1)


class QuoteBulkDeleteResult(BaseModel):
    deleted_count: int
