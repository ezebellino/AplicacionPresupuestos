from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infra.models import Client
from app.schemas.clients import ClientCreate, ClientUpdate


def list_clients(db: Session, tenant_id: UUID) -> list[Client]:
    return list(
        db.scalars(
            select(Client)
            .where(Client.tenant_id == tenant_id, Client.is_active.is_(True))
            .order_by(Client.created_at, Client.id)
        )
    )


def create_client(db: Session, tenant_id: UUID, payload: ClientCreate) -> Client:
    client = Client(tenant_id=tenant_id, **payload.model_dump())

    db.add(client)
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
) -> Client | None:
    client = get_client(db, tenant_id, client_id)

    if client is None:
        return None

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(client, field, value)

    db.commit()
    db.refresh(client)

    return client


def delete_client(db: Session, tenant_id: UUID, client_id: UUID) -> bool:
    client = get_client(db, tenant_id, client_id)

    if client is None:
        return False

    client.is_active = False
    db.commit()

    return True
