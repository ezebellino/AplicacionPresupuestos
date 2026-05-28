from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infra.models import Client, User
from app.schemas.clients import ClientCreate, ClientUpdate
from app.services.audit_service import record_audit_event


def list_clients(db: Session, tenant_id: UUID) -> list[Client]:
    return list(
        db.scalars(
            select(Client)
            .where(Client.tenant_id == tenant_id, Client.is_active.is_(True))
            .order_by(Client.created_at, Client.id)
        )
    )


def create_client(db: Session, tenant_id: UUID, payload: ClientCreate, actor: User | None = None) -> Client:
    client = Client(tenant_id=tenant_id, **payload.model_dump())

    db.add(client)
    db.flush()
    record_audit_event(
        db,
        actor=actor,
        tenant_id=tenant_id,
        entity_type="client",
        entity_id=client.id,
        action="created",
        summary=f"Cliente creado: {client.name}",
        metadata={"name": client.name, "email": client.email, "document": client.document},
    )
    db.commit()
    db.refresh(client)

    return client


def get_client(db: Session, tenant_id: UUID, client_id: UUID) -> Client | None:
    return db.scalar(
        select(Client).where(
            Client.tenant_id == tenant_id,
            Client.id == client_id,
            Client.is_active.is_(True),
        )
    )


def update_client(
    db: Session,
    tenant_id: UUID,
    client_id: UUID,
    payload: ClientUpdate,
    actor: User | None = None,
) -> Client | None:
    client = get_client(db, tenant_id, client_id)

    if client is None:
        return None

    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(client, field, value)

    record_audit_event(
        db,
        actor=actor,
        tenant_id=tenant_id,
        entity_type="client",
        entity_id=client.id,
        action="updated",
        summary=f"Cliente actualizado: {client.name}",
        metadata={"changes": changes, "name": client.name},
    )
    db.commit()
    db.refresh(client)

    return client


def delete_client(db: Session, tenant_id: UUID, client_id: UUID, actor: User | None = None) -> bool:
    client = get_client(db, tenant_id, client_id)

    if client is None:
        return False

    client.is_active = False
    record_audit_event(
        db,
        actor=actor,
        tenant_id=tenant_id,
        entity_type="client",
        entity_id=client.id,
        action="deleted",
        summary=f"Cliente desactivado: {client.name}",
        metadata={"name": client.name},
    )
    db.commit()

    return True
