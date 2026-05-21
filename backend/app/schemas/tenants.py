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
    address: str | None
    phone: str | None
    email: str | None
    website: str | None
    logo_url: str | None
    invoice_notes: str | None
    default_tax_rate: Decimal


class TenantProfileUpdate(BaseModel):
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    logo_url: str | None = None
    invoice_notes: str | None = None
    default_tax_rate: TaxRate | None = None


class TenantChangeRequestCreate(BaseModel):
    proposed_name: str | None = None
    proposed_legal_name: str | None = None
    proposed_tax_id: str | None = None
    reason: str | None = None


class TenantChangeRequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    requested_by_user_id: UUID
    status: str
    current_name: str | None
    current_legal_name: str | None
    current_tax_id: str | None
    proposed_name: str | None
    proposed_legal_name: str | None
    proposed_tax_id: str | None
    reason: str | None


class TenantChangeRequestList(BaseModel):
    items: list[TenantChangeRequestRead]


class PlatformReviewUpdate(BaseModel):
    review_notes: str | None = None


class TenantSignupRequestCreate(BaseModel):
    company_name: str
    contact_name: str
    email: str
    phone: str
    business_type: str | None = None
    message: str | None = None


class TenantSignupRequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_name: str
    contact_name: str
    email: str
    phone: str
    business_type: str | None
    message: str | None
    status: str
    review_notes: str | None


class TenantSignupRequestList(BaseModel):
    items: list[TenantSignupRequestRead]


class TenantAdminRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    email: str
    role: str


class TenantCreated(BaseModel):
    tenant: TenantRead
    admin: TenantAdminRead
