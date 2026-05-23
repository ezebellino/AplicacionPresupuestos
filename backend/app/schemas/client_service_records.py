from datetime import datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


Money = Annotated[Decimal, Field(ge=0, max_digits=12, decimal_places=2)]


class ClientServiceRecordCreate(BaseModel):
    performed_at: datetime
    title: str
    description: str | None = None
    amount: Money | None = None


class ClientServiceRecordRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    client_id: UUID
    performed_at: datetime
    title: str
    description: str | None
    amount: Decimal | None


class ClientServiceRecordList(BaseModel):
    items: list[ClientServiceRecordRead]
