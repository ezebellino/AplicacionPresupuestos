from __future__ import annotations

from collections.abc import Mapping, Sequence
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from sqlalchemy.orm import Session

from app.infra.models import AuditEvent, User


JsonScalar = str | int | float | bool | None
JsonValue = JsonScalar | list["JsonValue"] | dict[str, "JsonValue"]


def record_audit_event(
    db: Session,
    *,
    actor: User | None,
    tenant_id: UUID | None,
    entity_type: str,
    entity_id: UUID | None,
    action: str,
    summary: str,
    metadata: Mapping[str, object] | None = None,
) -> AuditEvent:
    event = AuditEvent(
        actor_user_id=actor.id if actor is not None else None,
        actor_email=actor.email if actor is not None else None,
        actor_role=actor.role if actor is not None else None,
        tenant_id=tenant_id if tenant_id is not None else (actor.tenant_id if actor is not None else None),
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        summary=summary,
        metadata_json=_normalize_mapping(metadata) if metadata else None,
    )
    db.add(event)
    return event


def _normalize_mapping(value: Mapping[str, object]) -> dict[str, JsonValue]:
    return {str(key): _normalize_value(item) for key, item in value.items()}


def _normalize_value(value: object) -> JsonValue:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Enum):
        raw_value = value.value
        return raw_value if isinstance(raw_value, (str, int, float, bool)) else str(raw_value)
    if isinstance(value, Mapping):
        return _normalize_mapping(value)
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return [_normalize_value(item) for item in value]
    return str(value)
