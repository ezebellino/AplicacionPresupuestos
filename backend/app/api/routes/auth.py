from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.security import create_access_token
from app.infra.models import User
from app.schemas.auth import CurrentUser, LoginRequest, TokenResponse
from app.services.audit_service import record_audit_event
from app.services.auth_service import authenticate_user


router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Annotated[Session, Depends(get_db)]) -> TokenResponse:
    user = authenticate_user(db, payload.email, payload.password)

    if user is None:
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
