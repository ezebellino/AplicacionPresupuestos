from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.infra.models import Tenant, User
from app.schemas.tenants import TenantCreate


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
