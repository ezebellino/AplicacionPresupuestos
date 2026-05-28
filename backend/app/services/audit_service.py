from __future__ import annotations

from collections.abc import Mapping, Sequence
from datetime import date, datetime, timezone
from decimal import Decimal
from enum import Enum
from uuid import UUID

from sqlalchemy import select
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


def list_audit_events(
    db: Session,
    *,
    actor_email: str | None = None,
    tenant_id: UUID | None = None,
    entity_type: str | None = None,
    action: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = 200,
) -> list[AuditEvent]:
    query = select(AuditEvent)

    if actor_email:
        query = query.where(AuditEvent.actor_email.ilike(f"%{actor_email.strip().lower()}%"))
    if tenant_id is not None:
        query = query.where(AuditEvent.tenant_id == tenant_id)
    if entity_type:
        query = query.where(AuditEvent.entity_type == entity_type)
    if action:
        query = query.where(AuditEvent.action == action)
    if date_from is not None:
        query = query.where(
            AuditEvent.created_at >= datetime.combine(date_from, datetime.min.time(), tzinfo=timezone.utc)
        )
    if date_to is not None:
        query = query.where(
            AuditEvent.created_at <= datetime.combine(date_to, datetime.max.time(), tzinfo=timezone.utc)
        )

    safe_limit = min(max(limit, 1), 500)
    query = query.order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc()).limit(safe_limit)
    return list(db.scalars(query))


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
