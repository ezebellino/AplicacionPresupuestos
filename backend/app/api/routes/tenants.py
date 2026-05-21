from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from uuid import UUID

from app.api.deps import get_db, require_platform_admin
from app.infra.models import User
from app.api.deps import get_current_user
from app.schemas.tenants import (
    TenantChangeRequestCreate,
    TenantChangeRequestList,
    TenantChangeRequestRead,
    PlatformReviewUpdate,
    PlatformTenantMembershipList,
    PlatformTenantMembershipRead,
    TenantCreate,
    TenantCreated,
    TenantProfileUpdate,
    TenantRead,
    TenantSignupApprove,
    TenantSignupRequestCreate,
    TenantSignupRequestList,
    TenantSignupRequestRead,
)
from app.services.tenants_service import (
    approve_tenant_change_request,
    approve_tenant_signup_request,
    create_tenant_change_request,
    create_tenant_signup_request,
    create_tenant_with_admin,
    list_platform_memberships,
    list_platform_tenant_change_requests,
    list_tenant_signup_requests,
    list_tenant_change_requests,
    mark_tenant_membership_paid,
    reject_tenant_change_request,
    update_tenant_signup_request_status,
)


router = APIRouter()


@router.post(
    "/signup-requests",
    response_model=TenantSignupRequestRead,
    status_code=status.HTTP_201_CREATED,
)
def create_signup_request(
    payload: TenantSignupRequestCreate,
    db: Annotated[Session, Depends(get_db)],
) -> object:
    try:
        return create_tenant_signup_request(db, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc


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


@router.get("/platform/signup-requests", response_model=TenantSignupRequestList)
def list_platform_signup_requests(
    _platform_admin: Annotated[User, Depends(require_platform_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, object]:
    return {"items": list_tenant_signup_requests(db)}


@router.post(
    "/platform/signup-requests/{request_id}/approve",
    response_model=TenantSignupRequestRead,
)
def approve_platform_signup_request(
    request_id: UUID,
    payload: TenantSignupApprove,
    platform_admin: Annotated[User, Depends(require_platform_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> object:
    try:
        request = approve_tenant_signup_request(db, platform_admin, request_id, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    return request


@router.post(
    "/platform/signup-requests/{request_id}/contacted",
    response_model=TenantSignupRequestRead,
)
def mark_platform_signup_request_contacted(
    request_id: UUID,
    payload: PlatformReviewUpdate,
    platform_admin: Annotated[User, Depends(require_platform_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> object:
    request = update_tenant_signup_request_status(
        db,
        platform_admin,
        request_id,
        "contacted",
        payload,
    )

    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    return request


@router.post(
    "/platform/signup-requests/{request_id}/rejected",
    response_model=TenantSignupRequestRead,
)
def reject_platform_signup_request(
    request_id: UUID,
    payload: PlatformReviewUpdate,
    platform_admin: Annotated[User, Depends(require_platform_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> object:
    request = update_tenant_signup_request_status(
        db,
        platform_admin,
        request_id,
        "rejected",
        payload,
    )

    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    return request


@router.get("/platform/change-requests", response_model=TenantChangeRequestList)
def list_platform_change_requests(
    _platform_admin: Annotated[User, Depends(require_platform_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, object]:
    return {"items": list_platform_tenant_change_requests(db)}


@router.get("/platform/memberships", response_model=PlatformTenantMembershipList)
def list_platform_tenant_memberships(
    _platform_admin: Annotated[User, Depends(require_platform_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, object]:
    return {"items": list_platform_memberships(db)}


@router.post(
    "/platform/memberships/{tenant_id}/paid",
    response_model=PlatformTenantMembershipRead,
)
def mark_platform_tenant_membership_paid(
    tenant_id: UUID,
    _platform_admin: Annotated[User, Depends(require_platform_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> object:
    tenant = mark_tenant_membership_paid(db, tenant_id)

    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    return tenant


@router.post(
    "/platform/change-requests/{request_id}/approve",
    response_model=TenantChangeRequestRead,
)
def approve_platform_change_request(
    request_id: UUID,
    payload: PlatformReviewUpdate,
    platform_admin: Annotated[User, Depends(require_platform_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> object:
    try:
        request = approve_tenant_change_request(db, platform_admin, request_id, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    return request


@router.post(
    "/platform/change-requests/{request_id}/reject",
    response_model=TenantChangeRequestRead,
)
def reject_platform_change_request(
    request_id: UUID,
    payload: PlatformReviewUpdate,
    platform_admin: Annotated[User, Depends(require_platform_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> object:
    try:
        request = reject_tenant_change_request(db, platform_admin, request_id, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    return request
