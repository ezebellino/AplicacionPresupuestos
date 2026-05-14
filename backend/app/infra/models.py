from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    and_,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    ForeignKeyConstraint,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, foreign, mapped_column, relationship

from app.domain.enums import CostCategory, QuoteStatus
from app.infra.db import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


cost_category_enum = Enum(
    CostCategory,
    values_callable=lambda enum_type: [item.value for item in enum_type],
    native_enum=False,
    length=20,
)
quote_status_enum = Enum(
    QuoteStatus,
    values_callable=lambda enum_type: [item.value for item in enum_type],
    native_enum=False,
    length=20,
)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class Tenant(TimestampMixin, Base):
    __tablename__ = "tenants"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    legal_name: Mapped[str | None] = mapped_column(String(255))
    tax_id: Mapped[str | None] = mapped_column(String(64))
    default_tax_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=Decimal("21.00")
    )

    users: Mapped[list["User"]] = relationship(back_populates="tenant")
    clients: Mapped[list["Client"]] = relationship(back_populates="tenant")
    client_service_records: Mapped[list["ClientServiceRecord"]] = relationship(
        back_populates="tenant"
    )
    cost_items: Mapped[list["CostItem"]] = relationship(back_populates="tenant")
    quotes: Mapped[list["Quote"]] = relationship(back_populates="tenant")


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="admin")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    tenant: Mapped[Tenant] = relationship(back_populates="users")


class Client(TimestampMixin, Base):
    __tablename__ = "clients"
    __table_args__ = (UniqueConstraint("id", "tenant_id", name="uq_clients_id_tenant_id"),)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    document: Mapped[str | None] = mapped_column(String(100))
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(100))
    address: Mapped[str | None] = mapped_column(String(500))
    notes: Mapped[str | None] = mapped_column(Text)

    tenant: Mapped[Tenant] = relationship(back_populates="clients")
    quotes: Mapped[list["Quote"]] = relationship(
        back_populates="client",
        primaryjoin=lambda: and_(
            Client.id == foreign(Quote.client_id),
            Client.tenant_id == Quote.tenant_id,
        ),
    )
    service_records: Mapped[list["ClientServiceRecord"]] = relationship(
        back_populates="client",
        primaryjoin=lambda: and_(
            Client.id == foreign(ClientServiceRecord.client_id),
            Client.tenant_id == ClientServiceRecord.tenant_id,
        ),
    )


class ClientServiceRecord(TimestampMixin, Base):
    __tablename__ = "client_service_records"
    __table_args__ = (
        ForeignKeyConstraint(
            ["client_id", "tenant_id"],
            ["clients.id", "clients.tenant_id"],
            name="fk_client_service_records_client_tenant",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )
    client_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    performed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))

    tenant: Mapped[Tenant] = relationship(back_populates="client_service_records")
    client: Mapped[Client] = relationship(
        back_populates="service_records",
        primaryjoin=lambda: and_(
            foreign(ClientServiceRecord.client_id) == Client.id,
            ClientServiceRecord.tenant_id == Client.tenant_id,
        ),
    )


class CostItem(TimestampMixin, Base):
    __tablename__ = "cost_items"
    __table_args__ = (
        UniqueConstraint("id", "tenant_id", name="uq_cost_items_id_tenant_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )
    category: Mapped[CostCategory] = mapped_column(cost_category_enum, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    tax_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    tenant: Mapped[Tenant] = relationship(back_populates="cost_items")
    quote_items: Mapped[list["QuoteItem"]] = relationship(
        back_populates="source_cost_item",
        primaryjoin=lambda: and_(
            CostItem.id == foreign(QuoteItem.source_cost_item_id),
            CostItem.tenant_id == QuoteItem.tenant_id,
        ),
    )


class Quote(TimestampMixin, Base):
    __tablename__ = "quotes"
    __table_args__ = (
        ForeignKeyConstraint(
            ["client_id", "tenant_id"],
            ["clients.id", "clients.tenant_id"],
            name="fk_quotes_client_tenant",
        ),
        UniqueConstraint("id", "tenant_id", name="uq_quotes_id_tenant_id"),
        UniqueConstraint("tenant_id", "number", name="uq_quotes_tenant_id_number"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )
    client_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    number: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[QuoteStatus] = mapped_column(
        quote_status_enum, nullable=False, default=QuoteStatus.DRAFT
    )
    title: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    tax_total: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    discount_total: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    total: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    issued_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    tenant: Mapped[Tenant] = relationship(back_populates="quotes")
    client: Mapped[Client] = relationship(
        back_populates="quotes",
        primaryjoin=lambda: and_(
            foreign(Quote.client_id) == Client.id,
            Quote.tenant_id == Client.tenant_id,
        ),
    )
    items: Mapped[list["QuoteItem"]] = relationship(
        back_populates="quote",
        primaryjoin=lambda: and_(
            Quote.id == foreign(QuoteItem.quote_id),
            Quote.tenant_id == QuoteItem.tenant_id,
        ),
    )


class QuoteItem(TimestampMixin, Base):
    __tablename__ = "quote_items"
    __table_args__ = (
        ForeignKeyConstraint(
            ["quote_id", "tenant_id"],
            ["quotes.id", "quotes.tenant_id"],
            name="fk_quote_items_quote_tenant",
        ),
        ForeignKeyConstraint(
            ["source_cost_item_id", "tenant_id"],
            ["cost_items.id", "cost_items.tenant_id"],
            name="fk_quote_items_source_cost_item_tenant",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True
    )
    quote_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    source_cost_item_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True))
    category: Mapped[CostCategory] = mapped_column(cost_category_enum, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    tax_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    line_subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    line_tax: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    line_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    position: Mapped[int] = mapped_column(nullable=False)

    quote: Mapped[Quote] = relationship(
        back_populates="items",
        primaryjoin=lambda: and_(
            foreign(QuoteItem.quote_id) == Quote.id,
            QuoteItem.tenant_id == Quote.tenant_id,
        ),
    )
    source_cost_item: Mapped[CostItem | None] = relationship(
        back_populates="quote_items",
        primaryjoin=lambda: and_(
            foreign(QuoteItem.source_cost_item_id) == CostItem.id,
            QuoteItem.tenant_id == CostItem.tenant_id,
        ),
    )
