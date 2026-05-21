from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.infra.models import User
from app.api.deps import get_current_user
from app.schemas.tenants import (
    TenantChangeRequestCreate,
    TenantChangeRequestList,
    TenantChangeRequestRead,
    TenantCreate,
    TenantCreated,
    TenantProfileUpdate,
    TenantRead,
)
from app.services.tenants_service import (
    create_tenant_change_request,
    create_tenant_with_admin,
    list_tenant_change_requests,
)


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


@router.get("/me", response_model=TenantRead)
def get_current_tenant_profile(
    current_user: Annotated[User, Depends(get_current_user)],
) -> object:
    return current_user.tenant


@router.patch("/me", response_model=TenantRead)
def update_current_tenant_profile(
    payload: TenantProfileUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> object:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user.tenant, field, value)

    db.commit()
    db.refresh(current_user.tenant)

    return current_user.tenant


@router.get("/me/change-requests", response_model=TenantChangeRequestList)
def list_current_tenant_change_requests(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, object]:
    return {"items": list_tenant_change_requests(db, current_user)}


@router.post(
    "/me/change-requests",
    response_model=TenantChangeRequestRead,
    status_code=status.HTTP_201_CREATED,
)
def create_current_tenant_change_request(
    payload: TenantChangeRequestCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> object:
    try:
        return create_tenant_change_request(db, current_user, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
