from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.domain.enums import CostCategory
from app.infra.models import User
from app.schemas.cost_items import (
    CostItemCreate,
    CostItemList,
    CostItemRead,
    CostItemUpdate,
)
from app.services.cost_items_service import (
    create_cost_item,
    deactivate_cost_item,
    get_cost_item,
    list_cost_items,
    serialize_cost_item,
    update_cost_item,
)


router = APIRouter()


@router.get("", response_model=CostItemList)
def list_current_tenant_cost_items(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    category: CostCategory | None = None,
) -> dict[str, object]:
    default_tax_rate = current_user.tenant.default_tax_rate

    return {
        "items": [
            serialize_cost_item(cost_item, default_tax_rate)
            for cost_item in list_cost_items(db, current_user.tenant_id, category)
        ]
    }


@router.post("", response_model=CostItemRead, status_code=status.HTTP_201_CREATED)
def create_current_tenant_cost_item(
    payload: CostItemCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    cost_item = create_cost_item(db, current_user.tenant_id, payload, current_user)

    return serialize_cost_item(cost_item, current_user.tenant.default_tax_rate)


@router.get("/{cost_item_id}", response_model=CostItemRead)
def get_current_tenant_cost_item(
    cost_item_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    cost_item = get_cost_item(db, current_user.tenant_id, cost_item_id)

    if cost_item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cost item not found",
        )

    return serialize_cost_item(cost_item, current_user.tenant.default_tax_rate)


@router.patch("/{cost_item_id}", response_model=CostItemRead)
def update_current_tenant_cost_item(
    cost_item_id: UUID,
    payload: CostItemUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    cost_item = update_cost_item(db, current_user.tenant_id, cost_item_id, payload, current_user)

    if cost_item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cost item not found",
        )

    return serialize_cost_item(cost_item, current_user.tenant.default_tax_rate)


@router.delete("/{cost_item_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_current_tenant_cost_item(
    cost_item_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    deactivated = deactivate_cost_item(db, current_user.tenant_id, cost_item_id, current_user)

    if not deactivated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cost item not found",
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
