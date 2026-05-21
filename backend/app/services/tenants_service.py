from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.infra.models import Tenant, TenantChangeRequest, TenantSignupRequest, User, utc_now
from app.schemas.tenants import (
    PlatformReviewUpdate,
    TenantChangeRequestCreate,
    TenantCreate,
    TenantSignupRequestCreate,
)


def create_tenant_with_admin(db: Session, payload: TenantCreate) -> tuple[Tenant, User]:
    tenant = Tenant(
        name=payload.name,
        legal_name=payload.legal_name,
        tax_id=payload.tax_id,
        default_tax_rate=payload.default_tax_rate,
    )
    admin = User(
        tenant=tenant,
        email=payload.admin_email.lower(),
        password_hash=hash_password(payload.admin_password),
        role="admin",
    )

    db.add(tenant)
    db.add(admin)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError("admin email already exists") from None

    db.refresh(tenant)
    db.refresh(admin)

    return tenant, admin


def list_tenant_change_requests(db: Session, user: User) -> list[TenantChangeRequest]:
    return list(
        db.scalars(
            select(TenantChangeRequest)
            .where(TenantChangeRequest.tenant_id == user.tenant_id)
            .order_by(TenantChangeRequest.created_at.desc())
        )
    )


def list_platform_tenant_change_requests(db: Session) -> list[TenantChangeRequest]:
    return list(
        db.scalars(
            select(TenantChangeRequest).order_by(TenantChangeRequest.created_at.desc())
        )
    )


def approve_tenant_change_request(
    db: Session,
    reviewer: User,
    request_id,
    payload: PlatformReviewUpdate,
) -> TenantChangeRequest | None:
    request = db.get(TenantChangeRequest, request_id)

    if request is None:
        return None

    if request.status != "pending":
        raise ValueError("request is not pending")

    tenant = request.tenant
    if request.proposed_name:
        tenant.name = request.proposed_name
    if request.proposed_legal_name:
        tenant.legal_name = request.proposed_legal_name
    if request.proposed_tax_id:
        tenant.tax_id = request.proposed_tax_id

    request.status = "approved"
    request.reviewed_at = utc_now()
    request.reviewed_by_user_id = reviewer.id
    request.review_notes = _clean(payload.review_notes)
    db.commit()
    db.refresh(request)

    return request


def reject_tenant_change_request(
    db: Session,
    reviewer: User,
    request_id,
    payload: PlatformReviewUpdate,
) -> TenantChangeRequest | None:
    request = db.get(TenantChangeRequest, request_id)

    if request is None:
        return None

    if request.status != "pending":
        raise ValueError("request is not pending")

    request.status = "rejected"
    request.reviewed_at = utc_now()
    request.reviewed_by_user_id = reviewer.id
    request.review_notes = _clean(payload.review_notes)
    db.commit()
    db.refresh(request)

    return request


def create_tenant_change_request(
    db: Session,
    user: User,
    payload: TenantChangeRequestCreate,
) -> TenantChangeRequest:
    proposed_name = _clean(payload.proposed_name)
    proposed_legal_name = _clean(payload.proposed_legal_name)
    proposed_tax_id = _clean(payload.proposed_tax_id)

    if not any([proposed_name, proposed_legal_name, proposed_tax_id]):
        raise ValueError("at least one fiscal field is required")

    tenant = user.tenant
    request = TenantChangeRequest(
        tenant_id=user.tenant_id,
        requested_by_user_id=user.id,
        current_name=tenant.name,
        current_legal_name=tenant.legal_name,
        current_tax_id=tenant.tax_id,
        proposed_name=proposed_name,
        proposed_legal_name=proposed_legal_name,
        proposed_tax_id=proposed_tax_id,
        reason=_clean(payload.reason),
        status="pending",
    )

    db.add(request)
    db.commit()
    db.refresh(request)

    return request


def create_tenant_signup_request(
    db: Session,
    payload: TenantSignupRequestCreate,
) -> TenantSignupRequest:
    request = TenantSignupRequest(
        company_name=payload.company_name.strip(),
        contact_name=payload.contact_name.strip(),
        email=payload.email.strip().lower(),
        phone=payload.phone.strip(),
        business_type=_clean(payload.business_type),
        message=_clean(payload.message),
        status="pending",
    )

    if not request.company_name or not request.contact_name or not request.email or not request.phone:
        raise ValueError("company, contact, email and phone are required")

    db.add(request)
    db.commit()
    db.refresh(request)

    return request


def list_tenant_signup_requests(db: Session) -> list[TenantSignupRequest]:
    return list(
        db.scalars(
            select(TenantSignupRequest).order_by(TenantSignupRequest.created_at.desc())
        )
    )


def update_tenant_signup_request_status(
    db: Session,
    reviewer: User,
    request_id,
    status: str,
    payload: PlatformReviewUpdate,
) -> TenantSignupRequest | None:
    request = db.get(TenantSignupRequest, request_id)

    if request is None:
        return None

    request.status = status
    request.reviewed_at = utc_now()
    request.reviewed_by_user_id = reviewer.id
    request.review_notes = _clean(payload.review_notes)
    db.commit()
    db.refresh(request)

    return request


def _clean(value: str | None) -> str | None:
    if value is None:
        return None

    stripped = value.strip()
    return stripped or None
