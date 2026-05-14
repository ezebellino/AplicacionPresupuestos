from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ClientCreate(BaseModel):
    name: str
    document: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    notes: str | None = None


class ClientUpdate(BaseModel):
    name: str | None = None
    document: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    notes: str | None = None


class ClientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    document: str | None
    email: str | None
    phone: str | None
    address: str | None
    notes: str | None


class ClientList(BaseModel):
    items: list[ClientRead]
