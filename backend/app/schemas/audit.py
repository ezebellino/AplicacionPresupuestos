from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AuditEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    actor_user_id: UUID | None
    actor_email: str | None
    actor_role: str | None
    tenant_id: UUID | None
    entity_type: str
    entity_id: UUID | None
    action: str
    summary: str
    metadata_json: dict | None


class AuditEventList(BaseModel):
    items: list[AuditEventRead]
