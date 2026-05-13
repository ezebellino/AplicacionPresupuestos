from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.domain.enums import CostCategory


class CostItemCreate(BaseModel):
    category: CostCategory
    name: str
    description: str | None = None
    unit: str
    unit_cost: Decimal
    tax_rate: Decimal | None = None


class CostItemUpdate(BaseModel):
    category: CostCategory | None = None
    name: str | None = None
    description: str | None = None
    unit: str | None = None
    unit_cost: Decimal | None = None
    tax_rate: Decimal | None = None


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
