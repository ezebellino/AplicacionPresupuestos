from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.tenants import TenantCreate, TenantCreated
from app.services.tenants_service import create_tenant_with_admin


router = APIRouter()


@router.post("", response_model=TenantCreated, status_code=status.HTTP_201_CREATED)
def create_tenant(
    payload: TenantCreate,
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, object]:
    try:
        tenant, admin = create_tenant_with_admin(db, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return {"tenant": tenant, "admin": admin}
