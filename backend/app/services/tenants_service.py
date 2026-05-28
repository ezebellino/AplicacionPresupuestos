from datetime import datetime, time, timedelta, timezone

from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.infra.models import (
    Client,
    CostItem,
    Tenant,
    TenantChangeRequest,
    TenantMembershipPayment,
    TenantSignupRequest,
    User,
    utc_now,
)
from app.schemas.quotes import QuoteCreate, QuoteItemCreate
from app.schemas.tenants import (
    PlatformMembershipPaymentCreate,
    PlatformMembershipPaymentCancel,
    PlatformMembershipPaymentUpdate,
    PlatformReviewUpdate,
    TenantChangeRequestCreate,
    TenantCreate,
    TenantSignupApprove,
    TenantSignupRequestCreate,
)
from app.services.quotes_service import add_quote_item, create_quote, issue_quote
from app.services.notification_service import notify_platform
from app.services.audit_service import record_audit_event


def create_tenant_with_admin(db: Session, payload: TenantCreate) -> tuple[Tenant, User]:
    tenant = Tenant(
        name=payload.name,
        legal_name=payload.legal_name,
        tax_id=payload.tax_id,
        default_tax_rate=payload.default_tax_rate,
        membership_due_date=utc_now().date() + timedelta(days=30),
        membership_status="active",
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


def list_platform_memberships(db: Session) -> list[Tenant]:
    tenants = list(
        db.scalars(
            select(Tenant)
            .options(selectinload(Tenant.membership_payments))
            .join(User)
            .where(User.role != "platform_admin")
            .distinct()
            .order_by(Tenant.name.asc())
        )
    )
    today = utc_now().date()
    changed = False

    for tenant in tenants:
        if tenant.membership_due_date and tenant.membership_due_date < today and tenant.membership_status == "active":
            tenant.membership_status = "expired"
            changed = True

    if changed:
        db.commit()

    return tenants


def mark_tenant_membership_paid(
    db: Session,
    platform_admin: User,
    tenant_id,
    payload: PlatformMembershipPaymentCreate,
) -> Tenant | None:
    tenant = _load_platform_membership_tenant(db, tenant_id)

    if tenant is None:
        return None

    paid_at = utc_now()
    quote = _issue_membership_quote(db, platform_admin, tenant, payload.months_covered)
    payment = TenantMembershipPayment(
        tenant=tenant,
        paid_at=paid_at,
        months_covered=payload.months_covered,
        amount=payload.amount,
        status="active",
        quote_id=quote.id,
        quote_number=quote.number,
        notes=_clean(payload.notes),
    )
    db.add(payment)
    db.flush()
    _recalculate_tenant_membership_state(tenant)
    record_audit_event(
        db,
        actor=platform_admin,
        tenant_id=tenant.id,
        entity_type="membership_payment",
        entity_id=payment.id,
        action="created",
        summary=f"Pago de membresia registrado para {tenant.name}",
        metadata={
            "tenant_name": tenant.name,
            "months_covered": payment.months_covered,
            "amount": payment.amount,
            "quote_number": payment.quote_number,
        },
    )

    db.commit()
    return _load_platform_membership_tenant(db, tenant_id)


def update_tenant_membership_payment(
    db: Session,
    platform_admin: User,
    tenant_id: UUID,
    payment_id: UUID,
    payload: PlatformMembershipPaymentUpdate,
) -> Tenant | None:
    tenant = _load_platform_membership_tenant(db, tenant_id)
    if tenant is None:
        return None

    payment = next((item for item in tenant.membership_payments if item.id == payment_id), None)
    if payment is None:
        raise LookupError("payment not found")
    if payment.status != "active":
        raise ValueError("payment is not active")
    if payload.paid_at < tenant.created_at.date():
        raise ValueError("payment date cannot be earlier than tenant creation")

    if payment.months_covered != payload.months_covered and payment.quote_id is not None:
        quote = _issue_membership_quote(db, platform_admin, tenant, payload.months_covered)
        payment.quote_id = quote.id
        payment.quote_number = quote.number

    payment.paid_at = datetime.combine(payload.paid_at, time(12, 0, tzinfo=timezone.utc))
    payment.months_covered = payload.months_covered
    payment.amount = payload.amount
    payment.notes = _clean(payload.notes)
    _recalculate_tenant_membership_state(tenant)
    record_audit_event(
        db,
        actor=platform_admin,
        tenant_id=tenant.id,
        entity_type="membership_payment",
        entity_id=payment.id,
        action="updated",
        summary=f"Pago de membresia actualizado para {tenant.name}",
        metadata={
            "tenant_name": tenant.name,
            "months_covered": payment.months_covered,
            "amount": payment.amount,
            "paid_at": payment.paid_at,
            "quote_number": payment.quote_number,
        },
    )

    db.commit()
    return _load_platform_membership_tenant(db, tenant_id)


def cancel_tenant_membership_payment(
    db: Session,
    platform_admin: User,
    tenant_id: UUID,
    payment_id: UUID,
    payload: PlatformMembershipPaymentCancel,
) -> Tenant | None:
    tenant = _load_platform_membership_tenant(db, tenant_id)
    if tenant is None:
        return None

    payment = next((item for item in tenant.membership_payments if item.id == payment_id), None)
    if payment is None:
        raise LookupError("payment not found")
    if payment.status != "active":
        raise ValueError("payment is not active")

    cancel_reason = _clean(payload.reason)
    if cancel_reason is None:
        raise ValueError("cancel reason is required")

    payment.status = "cancelled"
    payment.cancelled_at = utc_now()
    payment.cancelled_by_user_id = platform_admin.id
    payment.cancel_reason = cancel_reason
    _recalculate_tenant_membership_state(tenant)
    record_audit_event(
        db,
        actor=platform_admin,
        tenant_id=tenant.id,
        entity_type="membership_payment",
        entity_id=payment.id,
        action="cancelled",
        summary=f"Pago de membresia anulado para {tenant.name}",
        metadata={"tenant_name": tenant.name, "reason": cancel_reason, "quote_number": payment.quote_number},
    )

    db.commit()
    return _load_platform_membership_tenant(db, tenant_id)


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
    record_audit_event(
        db,
        actor=reviewer,
        tenant_id=request.tenant_id,
        entity_type="tenant_change_request",
        entity_id=request.id,
        action="approved",
        summary=f"Cambio fiscal aprobado para {tenant.name}",
        metadata={
            "tenant_name": tenant.name,
            "review_notes": request.review_notes,
            "proposed_name": request.proposed_name,
            "proposed_legal_name": request.proposed_legal_name,
            "proposed_tax_id": request.proposed_tax_id,
        },
    )
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
    record_audit_event(
        db,
        actor=reviewer,
        tenant_id=request.tenant_id,
        entity_type="tenant_change_request",
        entity_id=request.id,
        action="rejected",
        summary=f"Cambio fiscal rechazado para {request.tenant.name}",
        metadata={"tenant_name": request.tenant.name, "review_notes": request.review_notes},
    )
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
    db.flush()
    record_audit_event(
        db,
        actor=user,
        tenant_id=user.tenant_id,
        entity_type="tenant_change_request",
        entity_id=request.id,
        action="created",
        summary=f"Solicitud de cambio fiscal creada para {tenant.name}",
        metadata={
            "tenant_name": tenant.name,
            "proposed_name": proposed_name,
            "proposed_legal_name": proposed_legal_name,
            "proposed_tax_id": proposed_tax_id,
        },
    )
    db.commit()
    db.refresh(request)
    notify_platform(
        "Nueva solicitud de cambio fiscal en FacturEasy",
        "\n".join(
            [
                f"Empresa actual: {tenant.name}",
                f"Razon social actual: {tenant.legal_name or '-'}",
                f"CUIT actual: {tenant.tax_id or '-'}",
                f"Nueva empresa: {proposed_name or '-'}",
                f"Nueva razon social: {proposed_legal_name or '-'}",
                f"Nuevo CUIT: {proposed_tax_id or '-'}",
                f"Motivo: {_clean(payload.reason) or '-'}",
            ]
        ),
    )

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
    db.flush()
    record_audit_event(
        db,
        actor=None,
        tenant_id=None,
        entity_type="tenant_signup_request",
        entity_id=request.id,
        action="created",
        summary=f"Solicitud de alta creada para {request.company_name}",
        metadata={
            "company_name": request.company_name,
            "contact_name": request.contact_name,
            "email": request.email,
        },
    )
    db.commit()
    db.refresh(request)
    notify_platform(
        "Nueva solicitud de alta en FacturEasy",
        "\n".join(
            [
                f"Empresa: {request.company_name}",
                f"Responsable: {request.contact_name}",
                f"Email: {request.email}",
                f"Celular: {request.phone}",
                f"Rubro: {request.business_type or '-'}",
                f"Comentario: {request.message or '-'}",
            ]
        ),
    )

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
    record_audit_event(
        db,
        actor=reviewer,
        tenant_id=request.created_tenant_id,
        entity_type="tenant_signup_request",
        entity_id=request.id,
        action=status,
        summary=f"Solicitud de alta marcada como {status} para {request.company_name}",
        metadata={"company_name": request.company_name, "review_notes": request.review_notes},
    )
    db.commit()
    db.refresh(request)

    return request


def approve_tenant_signup_request(
    db: Session,
    reviewer: User,
    request_id,
    payload: TenantSignupApprove,
) -> TenantSignupRequest | None:
    request = db.get(TenantSignupRequest, request_id)

    if request is None:
        return None

    if request.status != "pending":
        raise ValueError("request is not pending")

    tenant = Tenant(
        name=request.company_name,
        email=request.email.lower(),
        phone=request.phone,
        membership_due_date=utc_now().date() + timedelta(days=30),
        membership_status="active",
    )
    admin = User(
        tenant=tenant,
        email=request.email.lower(),
        password_hash=hash_password(payload.admin_password),
        role="admin",
    )
    db.add(tenant)
    db.add(admin)

    try:
        db.flush()

        request.status = "approved"
        request.reviewed_at = utc_now()
        request.reviewed_by_user_id = reviewer.id
        request.review_notes = _clean(payload.review_notes)
        request.created_tenant_id = tenant.id
        request.created_admin_email = admin.email
        record_audit_event(
            db,
            actor=reviewer,
            tenant_id=tenant.id,
            entity_type="tenant_signup_request",
            entity_id=request.id,
            action="approved",
            summary=f"Solicitud de alta aprobada para {request.company_name}",
            metadata={"company_name": request.company_name, "admin_email": admin.email},
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError("admin email already exists") from None

    db.refresh(request)

    return request


def _clean(value: str | None) -> str | None:
    if value is None:
        return None

    stripped = value.strip()
    return stripped or None


def _ensure_platform_billing_client(db: Session, platform_tenant_id: UUID, tenant: Tenant) -> Client:
    client = db.scalar(
        select(Client).where(
            Client.tenant_id == platform_tenant_id,
            Client.name == tenant.name,
        )
    )
    if client is None:
        client = Client(
            tenant_id=platform_tenant_id,
            name=tenant.name,
            document=tenant.tax_id,
            email=tenant.email,
            phone=tenant.phone,
            address=tenant.address,
            notes="Cliente SaaS generado automaticamente desde plataforma.",
        )
        db.add(client)
        db.flush()
        return client

    if tenant.tax_id and not client.document:
        client.document = tenant.tax_id
    if tenant.email and not client.email:
        client.email = tenant.email
    if tenant.phone and not client.phone:
        client.phone = tenant.phone
    if tenant.address and not client.address:
        client.address = tenant.address
    return client


def _load_platform_membership_tenant(db: Session, tenant_id: UUID) -> Tenant | None:
    return db.scalar(
        select(Tenant)
        .options(selectinload(Tenant.membership_payments))
        .where(Tenant.id == tenant_id)
    )


def _issue_membership_quote(
    db: Session,
    platform_admin: User,
    tenant: Tenant,
    months_covered: int,
):
    billing_client = _ensure_platform_billing_client(db, platform_admin.tenant_id, tenant)
    cost_item = _find_membership_cost_item(db, platform_admin.tenant_id, months_covered)
    if cost_item is None:
        raise ValueError("membership billing item not found")

    quote = create_quote(
        db,
        platform_admin.tenant_id,
        QuoteCreate(
            client_id=billing_client.id,
            title=cost_item.name,
            notes=f"Membresia FacturEasy - {format_membership_cycle(months_covered)}",
        ),
        actor=None,
    )
    if quote is None:
        raise ValueError("could not create membership quote")

    item = add_quote_item(
        db,
        platform_admin.tenant,
        quote.id,
        QuoteItemCreate(source_cost_item_id=cost_item.id, quantity=Decimal("1.00")),
    )
    if item is None:
        raise ValueError("could not add membership quote item")

    quote = issue_quote(db, platform_admin.tenant_id, quote.id, actor=None)
    if quote is None:
        raise ValueError("could not issue membership quote")

    return quote


def update_tenant_profile(
    db: Session,
    user: User,
    payload,
) -> Tenant:
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(user.tenant, field, value)

    record_audit_event(
        db,
        actor=user,
        tenant_id=user.tenant_id,
        entity_type="tenant_profile",
        entity_id=user.tenant_id,
        action="updated",
        summary=f"Perfil de empresa actualizado: {user.tenant.name}",
        metadata={"changes": changes, "tenant_name": user.tenant.name},
    )
    db.commit()
    db.refresh(user.tenant)
    return user.tenant


def _recalculate_tenant_membership_state(tenant: Tenant) -> None:
    current_due = tenant.created_at.date() + timedelta(days=30)
    active_payments = sorted(
        (payment for payment in tenant.membership_payments if payment.status == "active"),
        key=lambda payment: (payment.paid_at, payment.created_at, str(payment.id)),
    )
    last_payment_at = None

    for payment in active_payments:
        paid_on = payment.paid_at.date()
        base_date = current_due if current_due > paid_on else paid_on
        current_due = base_date + timedelta(days=30 * payment.months_covered)
        last_payment_at = payment.paid_at

    tenant.membership_due_date = current_due
    tenant.membership_last_payment_at = last_payment_at
    tenant.membership_status = "expired" if current_due < utc_now().date() else "active"


def _find_membership_cost_item(db: Session, platform_tenant_id: UUID, months_covered: int) -> CostItem | None:
    expected_token = {
        1: "mensual",
        3: "trimestral",
        6: "semestral",
        12: "anual",
    }[months_covered]
    items = list(
        db.scalars(
            select(CostItem).where(
                CostItem.tenant_id == platform_tenant_id,
                CostItem.is_active.is_(True),
            )
        )
    )
    for item in items:
        normalized = item.name.strip().lower()
        if expected_token in normalized:
            return item
    return None


def format_membership_cycle(months_covered: int) -> str:
    labels = {
        1: "mensual",
        3: "trimestral",
        6: "semestral",
        12: "anual",
    }
    return labels.get(months_covered, f"{months_covered} meses")
