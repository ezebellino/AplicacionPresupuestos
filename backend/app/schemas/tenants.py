from datetime import date, datetime
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
    membership_status: str
    membership_due_date: date | None
    membership_last_payment_at: datetime | None
    membership_monthly_fee: Decimal | None
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


class PlatformMembershipPaymentCreate(BaseModel):
    months_covered: int = Field(ge=1, le=12)
    amount: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    notes: str | None = None


class TenantSignupApprove(BaseModel):
    admin_password: str = Field(min_length=8)
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
    created_tenant_id: UUID | None = None
    created_admin_email: str | None = None


class TenantSignupRequestList(BaseModel):
    items: list[TenantSignupRequestRead]


class PlatformTenantMembershipPaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    paid_at: datetime
    months_covered: int
    amount: Decimal | None
    quote_id: UUID | None
    quote_number: str | None
    notes: str | None


class PlatformTenantMembershipRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    legal_name: str | None
    tax_id: str | None
    email: str | None
    phone: str | None
    membership_status: str
    membership_due_date: date | None
    membership_last_payment_at: datetime | None
    membership_monthly_fee: Decimal | None
    payments: list[PlatformTenantMembershipPaymentRead] = Field(
        default_factory=list,
        validation_alias="membership_payments",
    )


class PlatformTenantMembershipList(BaseModel):
    items: list[PlatformTenantMembershipRead]


class TenantAdminRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    email: str
    role: str


class TenantCreated(BaseModel):
    tenant: TenantRead
    admin: TenantAdminRead
