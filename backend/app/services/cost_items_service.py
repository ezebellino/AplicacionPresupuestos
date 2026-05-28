from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.enums import CostCategory
from app.infra.models import CostItem, User
from app.schemas.cost_items import CostItemCreate, CostItemRead, CostItemUpdate
from app.services.audit_service import record_audit_event


def serialize_cost_item(
    cost_item: CostItem,
    default_tax_rate: Decimal,
) -> CostItemRead:
    effective_tax_rate = (
        cost_item.tax_rate if cost_item.tax_rate is not None else default_tax_rate
    )

    return CostItemRead.model_validate(
        {
            "id": cost_item.id,
            "category": cost_item.category,
            "name": cost_item.name,
            "description": cost_item.description,
            "unit": cost_item.unit,
            "unit_cost": cost_item.unit_cost,
            "tax_rate": cost_item.tax_rate,
            "effective_tax_rate": effective_tax_rate,
            "is_active": cost_item.is_active,
        }
    )


def list_cost_items(
    db: Session,
    tenant_id: UUID,
    category: CostCategory | None = None,
) -> list[CostItem]:
    query = select(CostItem).where(
        CostItem.tenant_id == tenant_id,
        CostItem.is_active.is_(True),
    )

    if category is not None:
        query = query.where(CostItem.category == category)

    return list(db.scalars(query.order_by(CostItem.created_at, CostItem.id)))


def create_cost_item(
    db: Session,
    tenant_id: UUID,
    payload: CostItemCreate,
    actor: User | None = None,
) -> CostItem:
    cost_item = CostItem(tenant_id=tenant_id, **payload.model_dump())

    db.add(cost_item)
    db.flush()
    record_audit_event(
        db,
        actor=actor,
        tenant_id=tenant_id,
        entity_type="cost_item",
        entity_id=cost_item.id,
        action="created",
        summary=f"Servicio creado: {cost_item.name}",
        metadata={"name": cost_item.name, "category": cost_item.category},
    )
    db.commit()
    db.refresh(cost_item)

    return cost_item


def get_cost_item(db: Session, tenant_id: UUID, cost_item_id: UUID) -> CostItem | None:
    return db.scalar(
        select(CostItem).where(
            CostItem.tenant_id == tenant_id,
            CostItem.id == cost_item_id,
            CostItem.is_active.is_(True),
        )
    )


def update_cost_item(
    db: Session,
    tenant_id: UUID,
    cost_item_id: UUID,
    payload: CostItemUpdate,
    actor: User | None = None,
) -> CostItem | None:
    cost_item = get_cost_item(db, tenant_id, cost_item_id)

    if cost_item is None:
        return None

    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(cost_item, field, value)

    record_audit_event(
        db,
        actor=actor,
        tenant_id=tenant_id,
        entity_type="cost_item",
        entity_id=cost_item.id,
        action="updated",
        summary=f"Servicio actualizado: {cost_item.name}",
        metadata={"changes": changes, "name": cost_item.name},
    )
    db.commit()
    db.refresh(cost_item)

    return cost_item


def deactivate_cost_item(
    db: Session, tenant_id: UUID, cost_item_id: UUID, actor: User | None = None
) -> bool:
    cost_item = get_cost_item(db, tenant_id, cost_item_id)

    if cost_item is None:
        return False

    cost_item.is_active = False
    record_audit_event(
        db,
        actor=actor,
        tenant_id=tenant_id,
        entity_type="cost_item",
        entity_id=cost_item.id,
        action="deactivated",
        summary=f"Servicio desactivado: {cost_item.name}",
        metadata={"name": cost_item.name},
    )
    db.commit()

    return True
