from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.logging import get_logger, log_business_event
from app.core.security import create_access_token
from app.infra.models import User
from app.schemas.auth import CurrentUser, LoginRequest, TokenResponse
from app.services.audit_service import record_audit_event
from app.services.auth_service import authenticate_user


router = APIRouter()
business_logger = get_logger("business.auth")


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    user = authenticate_user(db, payload.email, payload.password)

    if user is None:
        log_business_event(
            business_logger,
            event="auth_login_failed",
            request_id=getattr(request.state, "request_id", None),
            actor_email=payload.email.strip().lower(),
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    record_audit_event(
        db,
        actor=user,
        tenant_id=user.tenant_id,
        entity_type="auth",
        entity_id=user.id,
        action="login_succeeded",
        summary=f"Inicio de sesion exitoso para {user.email}",
        metadata={"role": user.role},
    )
    db.commit()
    log_business_event(
        business_logger,
        event="auth_login_succeeded",
        request_id=getattr(request.state, "request_id", None),
        user_id=user.id,
        tenant_id=user.tenant_id,
        actor_email=user.email,
        actor_role=user.role,
    )

    return TokenResponse(
        access_token=create_access_token(
            user_id=user.id,
            tenant_id=user.tenant_id,
            email=user.email,
            role=user.role,
        )
    )


@router.get("/me", response_model=CurrentUser)
def me(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    return current_user
