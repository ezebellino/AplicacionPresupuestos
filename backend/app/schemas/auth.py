from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.tenants import TenantRead


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CurrentUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    email: str
    role: str
    tenant: TenantRead
