from decimal import Decimal
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


TaxRate = Annotated[Decimal, Field(ge=0, le=100, max_digits=5, decimal_places=2)]


class TenantCreate(BaseModel):
    name: str
    admin_email: str
    admin_password: str
    legal_name: str | None = None
    tax_id: str | None = None
    default_tax_rate: TaxRate = Decimal("21.00")


class TenantRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    legal_name: str | None
    tax_id: str | None
    default_tax_rate: Decimal


class TenantAdminRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    email: str
    role: str


class TenantCreated(BaseModel):
    tenant: TenantRead
    admin: TenantAdminRead
