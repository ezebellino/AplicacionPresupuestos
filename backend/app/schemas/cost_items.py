from decimal import Decimal
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain.enums import CostCategory


UnitCost = Annotated[Decimal, Field(ge=0, max_digits=12, decimal_places=2)]
TaxRate = Annotated[Decimal, Field(ge=0, le=100, max_digits=5, decimal_places=2)]


class CostItemCreate(BaseModel):
    category: CostCategory
    name: str
    description: str | None = None
    unit: str
    unit_cost: UnitCost
    tax_rate: TaxRate | None = None


class CostItemUpdate(BaseModel):
    category: CostCategory | None = None
    name: str | None = None
    description: str | None = None
    unit: str | None = None
    unit_cost: UnitCost | None = None
    tax_rate: TaxRate | None = None


class CostItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    category: CostCategory
    name: str
    description: str | None
    unit: str
    unit_cost: Decimal
    tax_rate: Decimal | None
    effective_tax_rate: Decimal
    is_active: bool


class CostItemList(BaseModel):
    items: list[CostItemRead]
