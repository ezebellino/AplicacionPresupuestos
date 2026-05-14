from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infra.models import Client, ClientServiceRecord
from app.schemas.client_service_records import ClientServiceRecordCreate


def client_exists(db: Session, tenant_id: UUID, client_id: UUID) -> bool:
    return (
        db.scalar(
            select(Client.id).where(
                Client.tenant_id == tenant_id,
                Client.id == client_id,
            )
        )
        is not None
    )


def list_client_service_records(
    db: Session,
    tenant_id: UUID,
    client_id: UUID,
) -> list[ClientServiceRecord] | None:
    if not client_exists(db, tenant_id, client_id):
        return None

    return list(
        db.scalars(
            select(ClientServiceRecord)
            .where(
                ClientServiceRecord.tenant_id == tenant_id,
                ClientServiceRecord.client_id == client_id,
            )
            .order_by(ClientServiceRecord.performed_at.desc(), ClientServiceRecord.id)
        )
    )


def create_client_service_record(
    db: Session,
    tenant_id: UUID,
    client_id: UUID,
    payload: ClientServiceRecordCreate,
) -> ClientServiceRecord | None:
    if not client_exists(db, tenant_id, client_id):
        return None

    record = ClientServiceRecord(
        tenant_id=tenant_id,
        client_id=client_id,
        **payload.model_dump(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return record
