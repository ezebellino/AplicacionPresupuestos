from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.enums import CostCategory
from app.infra.models import CostItem
from app.schemas.cost_items import CostItemCreate, CostItemRead, CostItemUpdate


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
) -> CostItem:
    cost_item = CostItem(tenant_id=tenant_id, **payload.model_dump())

    db.add(cost_item)
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
) -> CostItem | None:
    cost_item = get_cost_item(db, tenant_id, cost_item_id)

    if cost_item is None:
        return None

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(cost_item, field, value)

    db.commit()
    db.refresh(cost_item)

    return cost_item


def deactivate_cost_item(db: Session, tenant_id: UUID, cost_item_id: UUID) -> bool:
    cost_item = get_cost_item(db, tenant_id, cost_item_id)

    if cost_item is None:
        return False

    cost_item.is_active = False
    db.commit()

    return True
