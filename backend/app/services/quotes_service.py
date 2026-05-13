from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain.enums import QuoteStatus
from app.domain.quote_calculator import QuoteLineInput, calculate_quote
from app.infra.models import Client, CostItem, Quote, QuoteItem, Tenant
from app.schemas.quotes import (
    QuoteCreate,
    QuoteItemCreate,
    QuoteItemRead,
    QuoteItemUpdate,
    QuoteRead,
    QuoteUpdate,
)


ZERO = Decimal("0.00")


class QuoteConflictError(ValueError):
    pass


def serialize_quote_item(item: QuoteItem) -> QuoteItemRead:
    return QuoteItemRead.model_validate(item)


def serialize_quote(quote: Quote) -> QuoteRead:
    return QuoteRead.model_validate(
        {
            "id": quote.id,
            "client_id": quote.client_id,
            "number": quote.number,
            "status": quote.status,
            "title": quote.title,
            "notes": quote.notes,
            "valid_until": quote.valid_until,
            "subtotal": quote.subtotal,
            "discount_total": quote.discount_total,
            "tax_total": quote.tax_total,
            "total": quote.total,
            "issued_at": quote.issued_at,
            "items": [
                serialize_quote_item(item)
                for item in sorted(quote.items, key=lambda item: (item.position, item.id))
            ],
        }
    )


def list_quotes(db: Session, tenant_id: UUID) -> list[Quote]:
    return list(
        db.scalars(
            select(Quote)
            .where(Quote.tenant_id == tenant_id)
            .order_by(Quote.created_at, Quote.id)
        )
    )


def get_quote(db: Session, tenant_id: UUID, quote_id: UUID) -> Quote | None:
    return db.scalar(
        select(Quote).where(
            Quote.tenant_id == tenant_id,
            Quote.id == quote_id,
        )
    )


def create_quote(db: Session, tenant_id: UUID, payload: QuoteCreate) -> Quote | None:
    if _get_client(db, tenant_id, payload.client_id) is None:
        return None

    quote = Quote(
        tenant_id=tenant_id,
        client_id=payload.client_id,
        number=_next_quote_number(db, tenant_id),
        status=QuoteStatus.DRAFT,
        title=payload.title,
        notes=payload.notes,
        valid_until=payload.valid_until,
        subtotal=ZERO,
        tax_total=ZERO,
        discount_total=ZERO,
        total=ZERO,
    )

    db.add(quote)
    db.commit()
    db.refresh(quote)

    return quote


def update_quote(
    db: Session,
    tenant_id: UUID,
    quote_id: UUID,
    payload: QuoteUpdate,
) -> Quote | None:
    quote = get_quote(db, tenant_id, quote_id)

    if quote is None:
        return None
    if quote.status != QuoteStatus.DRAFT:
        raise QuoteConflictError("Only draft quotes can be edited")
    if payload.client_id is not None and _get_client(db, tenant_id, payload.client_id) is None:
        return None

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(quote, field, value)

    db.commit()
    db.refresh(quote)

    return quote


def add_quote_item(
    db: Session,
    tenant: Tenant,
    quote_id: UUID,
    payload: QuoteItemCreate,
) -> QuoteItem | None:
    quote = get_quote(db, tenant.id, quote_id)

    if quote is None:
        return None
    _ensure_draft(quote)

    cost_item = _get_active_cost_item(db, tenant.id, payload.source_cost_item_id)
    if cost_item is None:
        return None

    items = _list_quote_items(db, tenant.id, quote.id)
    item = QuoteItem(
        tenant_id=tenant.id,
        quote_id=quote.id,
        source_cost_item_id=cost_item.id,
        category=cost_item.category,
        name=cost_item.name,
        description=cost_item.description,
        unit=cost_item.unit,
        quantity=payload.quantity,
        unit_price=cost_item.unit_cost,
        tax_rate=cost_item.tax_rate
        if cost_item.tax_rate is not None
        else tenant.default_tax_rate,
        discount_amount=payload.discount_amount,
        line_subtotal=ZERO,
        line_tax=ZERO,
        line_total=ZERO,
        position=(items[-1].position + 1) if items else 1,
    )
    items.append(item)
    _recalculate_quote(quote, items)

    db.add(item)
    db.commit()
    db.refresh(item)

    return item


def update_quote_item(
    db: Session,
    tenant_id: UUID,
    quote_id: UUID,
    item_id: UUID,
    payload: QuoteItemUpdate,
) -> QuoteItem | None:
    quote = get_quote(db, tenant_id, quote_id)

    if quote is None:
        return None
    _ensure_draft(quote)

    item = _get_quote_item(db, tenant_id, quote_id, item_id)
    if item is None:
        return None

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    _recalculate_quote(quote, _list_quote_items(db, tenant_id, quote_id))
    db.commit()
    db.refresh(item)

    return item


def delete_quote_item(
    db: Session,
    tenant_id: UUID,
    quote_id: UUID,
    item_id: UUID,
) -> bool:
    quote = get_quote(db, tenant_id, quote_id)

    if quote is None:
        return False
    _ensure_draft(quote)

    item = _get_quote_item(db, tenant_id, quote_id, item_id)
    if item is None:
        return False

    remaining_items = [
        existing_item
        for existing_item in _list_quote_items(db, tenant_id, quote_id)
        if existing_item.id != item.id
    ]
    db.delete(item)
    _recalculate_quote(quote, remaining_items)
    db.commit()

    return True


def issue_quote(db: Session, tenant_id: UUID, quote_id: UUID) -> Quote | None:
    quote = get_quote(db, tenant_id, quote_id)

    if quote is None:
        return None
    if quote.status != QuoteStatus.DRAFT:
        raise QuoteConflictError("Quote can only be issued from draft")

    quote.status = QuoteStatus.ISSUED
    if quote.issued_at is None:
        quote.issued_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(quote)

    return quote


def accept_quote(db: Session, tenant_id: UUID, quote_id: UUID) -> Quote | None:
    return _transition_from_issued(db, tenant_id, quote_id, QuoteStatus.ACCEPTED)


def reject_quote(db: Session, tenant_id: UUID, quote_id: UUID) -> Quote | None:
    return _transition_from_issued(db, tenant_id, quote_id, QuoteStatus.REJECTED)


def _transition_from_issued(
    db: Session,
    tenant_id: UUID,
    quote_id: UUID,
    target_status: QuoteStatus,
) -> Quote | None:
    quote = get_quote(db, tenant_id, quote_id)

    if quote is None:
        return None
    if quote.status != QuoteStatus.ISSUED:
        raise QuoteConflictError("Quote can only transition from issued")

    quote.status = target_status
    db.commit()
    db.refresh(quote)

    return quote


def _ensure_draft(quote: Quote) -> None:
    if quote.status != QuoteStatus.DRAFT:
        raise QuoteConflictError("Only draft quotes can be edited")


def _recalculate_quote(quote: Quote, items: list[QuoteItem]) -> None:
    ordered_items = sorted(items, key=lambda item: (item.position, item.id))
    totals = calculate_quote(
        [
            QuoteLineInput(
                quantity=item.quantity,
                unit_price=item.unit_price,
                tax_rate=item.tax_rate,
                discount_amount=item.discount_amount,
            )
            for item in ordered_items
        ]
    )

    for item, line in zip(ordered_items, totals.lines, strict=True):
        item.line_subtotal = line.line_subtotal
        item.line_tax = line.line_tax
        item.line_total = line.line_total

    quote.subtotal = totals.subtotal
    quote.discount_total = totals.discount_total
    quote.tax_total = totals.tax_total
    quote.total = totals.total


def _next_quote_number(db: Session, tenant_id: UUID) -> str:
    count = db.scalar(select(func.count()).select_from(Quote).where(Quote.tenant_id == tenant_id))

    return f"Q-{(count or 0) + 1:06d}"


def _get_client(db: Session, tenant_id: UUID, client_id: UUID) -> Client | None:
    return db.scalar(
        select(Client).where(
            Client.tenant_id == tenant_id,
            Client.id == client_id,
        )
    )


def _get_active_cost_item(
    db: Session,
    tenant_id: UUID,
    cost_item_id: UUID,
) -> CostItem | None:
    return db.scalar(
        select(CostItem).where(
            CostItem.tenant_id == tenant_id,
            CostItem.id == cost_item_id,
            CostItem.is_active.is_(True),
        )
    )


def _get_quote_item(
    db: Session,
    tenant_id: UUID,
    quote_id: UUID,
    item_id: UUID,
) -> QuoteItem | None:
    return db.scalar(
        select(QuoteItem).where(
            QuoteItem.tenant_id == tenant_id,
            QuoteItem.quote_id == quote_id,
            QuoteItem.id == item_id,
        )
    )


def _list_quote_items(db: Session, tenant_id: UUID, quote_id: UUID) -> list[QuoteItem]:
    return list(
        db.scalars(
            select(QuoteItem)
            .where(
                QuoteItem.tenant_id == tenant_id,
                QuoteItem.quote_id == quote_id,
            )
            .order_by(QuoteItem.position, QuoteItem.id)
        )
    )
