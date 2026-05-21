from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.infra.models import Tenant, TenantChangeRequest, User
from app.schemas.tenants import TenantChangeRequestCreate, TenantCreate


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


def _clean(value: str | None) -> str | None:
    if value is None:
        return None

    stripped = value.strip()
    return stripped or None
