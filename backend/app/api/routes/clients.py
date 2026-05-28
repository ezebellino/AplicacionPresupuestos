from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.infra.models import User
from app.schemas.client_service_records import (
    ClientServiceRecordCreate,
    ClientServiceRecordList,
    ClientServiceRecordRead,
)
from app.schemas.clients import ClientCreate, ClientList, ClientRead, ClientUpdate
from app.services.client_service_records_service import (
    create_client_service_record,
    list_client_service_records,
)
from app.services.clients_service import (
    create_client,
    delete_client,
    get_client,
    list_clients,
    update_client,
)


router = APIRouter()


@router.get("", response_model=ClientList)
def list_current_tenant_clients(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict[str, object]:
    return {"items": list_clients(db, current_user.tenant_id)}


@router.post("", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
def create_current_tenant_client(
    payload: ClientCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return create_client(db, current_user.tenant_id, payload, current_user)


@router.get("/{client_id}", response_model=ClientRead)
def get_current_tenant_client(
    client_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    client = get_client(db, current_user.tenant_id, client_id)

    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    return client


@router.get("/{client_id}/service-records", response_model=ClientServiceRecordList)
def list_current_tenant_client_service_records(
    client_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict[str, object]:
    records = list_client_service_records(db, current_user.tenant_id, client_id)

    if records is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    return {"items": records}


@router.post(
    "/{client_id}/service-records",
    response_model=ClientServiceRecordRead,
    status_code=status.HTTP_201_CREATED,
)
def create_current_tenant_client_service_record(
    client_id: UUID,
    payload: ClientServiceRecordCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    record = create_client_service_record(
        db,
        current_user.tenant_id,
        client_id,
        payload,
    )

    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    return record


@router.patch("/{client_id}", response_model=ClientRead)
def update_current_tenant_client(
    client_id: UUID,
    payload: ClientUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    client = update_client(db, current_user.tenant_id, client_id, payload, current_user)

    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_current_tenant_client(
    client_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    deleted = delete_client(db, current_user.tenant_id, client_id, current_user)

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    return Response(status_code=status.HTTP_204_NO_CONTENT)
