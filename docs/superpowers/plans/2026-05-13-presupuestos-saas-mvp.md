# Presupuestos SaaS MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a functional multitenant SaaS MVP for climatizacion quotes with tenant admin login, clients, cost catalog, quote calculations, quote states, PDF generation, and portable local/Railway/Proxmox infrastructure.

**Architecture:** Monorepo with `backend` FastAPI app using Clean Architecture boundaries and `frontend` React/Vite app organized by feature. PostgreSQL is the production database, SQLite is allowed only for fast repository/service tests where the behavior is database-portable. All business data is scoped by `tenant_id` from the authenticated JWT, never from frontend input.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2, Alembic, Pydantic, Pytest, Passlib/bcrypt, python-jose, ReportLab, PostgreSQL, React, TypeScript, Vite, Tailwind, Shadcn UI, SweetAlert2, Vitest, Testing Library, Docker Compose.

---

## File Structure

Create this structure:

```text
backend/
  app/
    api/
      deps.py
      main.py
      routes/
        auth.py
        clients.py
        cost_items.py
        quotes.py
        tenants.py
    core/
      config.py
      security.py
    domain/
      enums.py
      money.py
      quote_calculator.py
    infra/
      db.py
      models.py
      repositories.py
      pdf.py
    schemas/
      auth.py
      clients.py
      cost_items.py
      quotes.py
      tenants.py
    services/
      auth_service.py
      clients_service.py
      cost_items_service.py
      quotes_service.py
      tenants_service.py
  alembic/
  tests/
    conftest.py
    test_auth.py
    test_clients.py
    test_cost_items.py
    test_quote_calculator.py
    test_quotes.py
    test_tenancy.py
  alembic.ini
  pyproject.toml
  Dockerfile
frontend/
  src/
    app/
      App.tsx
      routes.tsx
    features/
      auth/
      clients/
      costs/
      dashboard/
      quotes/
    shared/
      api/
      components/
      types.ts
    main.tsx
    styles.css
  index.html
  package.json
  vite.config.ts
  tailwind.config.ts
  Dockerfile
docker-compose.yml
.env.example
README.md
```

Each backend service owns business orchestration for one feature. Repositories own SQLAlchemy queries and must require tenant scope for tenant-owned entities. React feature folders own pages, forms, API calls, and local view helpers for that feature.

## Task 1: Backend Project Skeleton

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/api/main.py`
- Create: `backend/app/core/config.py`
- Create: `backend/app/domain/money.py`
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: Write the failing smoke test**

Create `backend/tests/test_app_smoke.py`:

```python
from fastapi.testclient import TestClient

from app.api.main import app


def test_health_endpoint_returns_ok():
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend
python -m pytest tests/test_app_smoke.py -v
```

Expected: FAIL because `app.api.main` or `/health` does not exist.

- [ ] **Step 3: Add minimal backend package and app**

Create `backend/pyproject.toml`:

```toml
[project]
name = "presupuestos-backend"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "alembic>=1.13",
  "bcrypt>=4.1",
  "fastapi>=0.115",
  "passlib[bcrypt]>=1.7",
  "psycopg[binary]>=3.2",
  "pydantic-settings>=2.6",
  "python-jose[cryptography]>=3.3",
  "python-multipart>=0.0.12",
  "reportlab>=4.2",
  "sqlalchemy>=2.0",
  "uvicorn[standard]>=0.32"
]

[project.optional-dependencies]
dev = [
  "httpx>=0.27",
  "pytest>=8.3",
  "pytest-asyncio>=0.24"
]

[tool.pytest.ini_options]
pythonpath = ["."]
testpaths = ["tests"]
```

Create `backend/app/api/main.py`:

```python
from fastapi import FastAPI


app = FastAPI(title="Presupuestos SaaS API")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
```

Create `backend/app/core/config.py`:

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite+pysqlite:///:memory:"
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
```

Create `backend/app/domain/money.py`:

```python
from decimal import Decimal, ROUND_HALF_UP


CENT = Decimal("0.01")


def quantize_money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)
```

Create `backend/tests/conftest.py`:

```python
import pytest


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd backend
python -m pytest tests/test_app_smoke.py -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat: scaffold FastAPI backend"
```

## Task 2: Database Models And Migrations

**Files:**
- Create: `backend/app/domain/enums.py`
- Create: `backend/app/infra/db.py`
- Create: `backend/app/infra/models.py`
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/versions/0001_initial_schema.py`
- Test: `backend/tests/test_models.py`

- [ ] **Step 1: Write failing model metadata test**

Create `backend/tests/test_models.py`:

```python
from app.infra.models import Base, CostCategory, QuoteStatus


def test_initial_schema_contains_core_tables():
    tables = set(Base.metadata.tables.keys())

    assert {
        "tenants",
        "users",
        "clients",
        "cost_items",
        "quotes",
        "quote_items",
    }.issubset(tables)


def test_enums_match_mvp_states_and_categories():
    assert [item.value for item in CostCategory] == [
        "equipment",
        "materials",
        "labor",
        "services",
    ]
    assert [item.value for item in QuoteStatus] == [
        "draft",
        "issued",
        "accepted",
        "rejected",
    ]
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend
python -m pytest tests/test_models.py -v
```

Expected: FAIL because models and enums do not exist.

- [ ] **Step 3: Implement SQLAlchemy models**

Create `backend/app/domain/enums.py`:

```python
from enum import StrEnum


class CostCategory(StrEnum):
    EQUIPMENT = "equipment"
    MATERIALS = "materials"
    LABOR = "labor"
    SERVICES = "services"


class QuoteStatus(StrEnum):
    DRAFT = "draft"
    ISSUED = "issued"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
```

Create `backend/app/infra/db.py`:

```python
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

Create `backend/app/infra/models.py` with SQLAlchemy 2 mapped classes for `Tenant`, `User`, `Client`, `CostItem`, `Quote`, and `QuoteItem`. Use `Numeric(12, 2)` for money, `Numeric(5, 2)` for tax rates, `ForeignKey` constraints, `created_at`/`updated_at`, and Python enums from `app.domain.enums`. Re-export `Base`, `CostCategory`, and `QuoteStatus` from this module so the test imports pass.

- [ ] **Step 4: Add Alembic configuration and initial migration**

Create `backend/alembic.ini`, `backend/alembic/env.py`, and `backend/alembic/versions/0001_initial_schema.py`. The migration must create all six tables with indexes on tenant-scoped lookup fields:

```python
op.create_index("ix_clients_tenant_id", "clients", ["tenant_id"])
op.create_index("ix_cost_items_tenant_id", "cost_items", ["tenant_id"])
op.create_index("ix_quotes_tenant_id", "quotes", ["tenant_id"])
op.create_index("ix_quote_items_tenant_id", "quote_items", ["tenant_id"])
```

- [ ] **Step 5: Run tests**

Run:

```bash
cd backend
python -m pytest tests/test_models.py -v
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/domain/enums.py backend/app/infra backend/alembic.ini backend/alembic backend/tests/test_models.py
git commit -m "feat: add database schema"
```

## Task 3: Quote Calculation Domain Logic

**Files:**
- Create: `backend/app/domain/quote_calculator.py`
- Test: `backend/tests/test_quote_calculator.py`

- [ ] **Step 1: Write failing calculation tests**

Create `backend/tests/test_quote_calculator.py`:

```python
from decimal import Decimal

from app.domain.quote_calculator import QuoteLineInput, calculate_quote


def test_calculates_quote_totals_with_item_tax_and_discount():
    result = calculate_quote(
        [
            QuoteLineInput(quantity=Decimal("2"), unit_price=Decimal("100.00"), tax_rate=Decimal("21.00"), discount_amount=Decimal("10.00")),
            QuoteLineInput(quantity=Decimal("1"), unit_price=Decimal("50.00"), tax_rate=Decimal("10.50"), discount_amount=Decimal("0.00")),
        ]
    )

    assert result.subtotal == Decimal("250.00")
    assert result.discount_total == Decimal("10.00")
    assert result.tax_total == Decimal("45.15")
    assert result.total == Decimal("285.15")


def test_rejects_negative_quantity():
    try:
        calculate_quote([QuoteLineInput(quantity=Decimal("-1"), unit_price=Decimal("100.00"), tax_rate=Decimal("21.00"))])
    except ValueError as exc:
        assert "quantity" in str(exc)
    else:
        raise AssertionError("expected ValueError")
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd backend
python -m pytest tests/test_quote_calculator.py -v
```

Expected: FAIL because `quote_calculator` does not exist.

- [ ] **Step 3: Implement calculator**

Create `backend/app/domain/quote_calculator.py`:

```python
from dataclasses import dataclass
from decimal import Decimal

from app.domain.money import quantize_money


@dataclass(frozen=True)
class QuoteLineInput:
    quantity: Decimal
    unit_price: Decimal
    tax_rate: Decimal
    discount_amount: Decimal = Decimal("0.00")


@dataclass(frozen=True)
class QuoteLineResult:
    line_subtotal: Decimal
    line_tax: Decimal
    line_total: Decimal


@dataclass(frozen=True)
class QuoteTotals:
    lines: list[QuoteLineResult]
    subtotal: Decimal
    discount_total: Decimal
    tax_total: Decimal
    total: Decimal


def calculate_quote(lines: list[QuoteLineInput]) -> QuoteTotals:
    results: list[QuoteLineResult] = []
    subtotal = Decimal("0.00")
    discount_total = Decimal("0.00")
    tax_total = Decimal("0.00")
    total = Decimal("0.00")

    for line in lines:
        if line.quantity <= 0:
            raise ValueError("quantity must be greater than zero")
        if line.unit_price < 0:
            raise ValueError("unit_price cannot be negative")
        if line.tax_rate < 0:
            raise ValueError("tax_rate cannot be negative")
        if line.discount_amount < 0:
            raise ValueError("discount_amount cannot be negative")

        line_subtotal = quantize_money(line.quantity * line.unit_price)
        taxable_amount = line_subtotal - line.discount_amount
        if taxable_amount < 0:
            raise ValueError("discount_amount cannot exceed line subtotal")
        line_tax = quantize_money(taxable_amount * line.tax_rate / Decimal("100"))
        line_total = quantize_money(taxable_amount + line_tax)

        results.append(QuoteLineResult(line_subtotal=line_subtotal, line_tax=line_tax, line_total=line_total))
        subtotal += line_subtotal
        discount_total += line.discount_amount
        tax_total += line_tax
        total += line_total

    return QuoteTotals(
        lines=results,
        subtotal=quantize_money(subtotal),
        discount_total=quantize_money(discount_total),
        tax_total=quantize_money(tax_total),
        total=quantize_money(total),
    )
```

- [ ] **Step 4: Run tests**

Run:

```bash
cd backend
python -m pytest tests/test_quote_calculator.py -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/domain/quote_calculator.py backend/tests/test_quote_calculator.py
git commit -m "feat: add quote calculator"
```

## Task 4: Tenant Admin Auth

**Files:**
- Create: `backend/app/core/security.py`
- Create: `backend/app/schemas/auth.py`
- Create: `backend/app/schemas/tenants.py`
- Create: `backend/app/services/tenants_service.py`
- Create: `backend/app/services/auth_service.py`
- Create: `backend/app/api/deps.py`
- Create: `backend/app/api/routes/auth.py`
- Create: `backend/app/api/routes/tenants.py`
- Modify: `backend/app/api/main.py`
- Test: `backend/tests/test_auth.py`

- [ ] **Step 1: Write failing auth flow test**

Create `backend/tests/test_auth.py` with fixtures that create an in-memory database, call `POST /admin/tenants`, login with `POST /auth/login`, and assert `GET /auth/me` returns the created user with `tenant_id` and `role=admin`.

Use this expected shape:

```python
assert token_response.json()["access_token"]
assert me_response.json()["email"] == "admin@acme.test"
assert me_response.json()["role"] == "admin"
assert me_response.json()["tenant"]["name"] == "Acme Clima"
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend
python -m pytest tests/test_auth.py -v
```

Expected: FAIL because auth routes and tenant service do not exist.

- [ ] **Step 3: Implement password hashing and JWT**

Create `backend/app/core/security.py` with:

```python
from datetime import datetime, timedelta, timezone
from uuid import UUID

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings


password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_context.verify(password, password_hash)


def create_access_token(user_id: UUID, tenant_id: UUID, email: str, role: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_minutes)
    payload = {"sub": str(user_id), "tenant_id": str(tenant_id), "email": email, "role": role, "exp": expires}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
```

- [ ] **Step 4: Implement schemas, services, routes and dependency**

Add Pydantic schemas for tenant creation, login, token response, and current user. Implement:

- `create_tenant_with_admin(db, payload)`
- `authenticate_user(db, email, password)`
- `get_current_user(db, credentials)`

Register routers in `backend/app/api/main.py`:

```python
from app.api.routes import auth, tenants

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(tenants.router, prefix="/admin/tenants", tags=["admin"])
```

- [ ] **Step 5: Run auth tests**

Run:

```bash
cd backend
python -m pytest tests/test_auth.py -v
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/core/security.py backend/app/schemas backend/app/services backend/app/api backend/tests/test_auth.py
git commit -m "feat: add tenant admin authentication"
```

## Task 5: Tenant-Scoped Clients

**Files:**
- Create: `backend/app/schemas/clients.py`
- Create: `backend/app/services/clients_service.py`
- Create: `backend/app/api/routes/clients.py`
- Modify: `backend/app/api/main.py`
- Test: `backend/tests/test_clients.py`
- Test: `backend/tests/test_tenancy.py`

- [ ] **Step 1: Write failing client CRUD and isolation tests**

Create tests that:

- create two tenants;
- login as each tenant admin;
- create one client per tenant;
- assert each tenant sees only its own client;
- assert tenant A cannot fetch tenant B client by id.

Expected assertions:

```python
assert response_a.json()["items"][0]["name"] == "Cliente A"
assert response_b.json()["items"][0]["name"] == "Cliente B"
assert forbidden_response.status_code == 404
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd backend
python -m pytest tests/test_clients.py tests/test_tenancy.py -v
```

Expected: FAIL because client routes do not exist.

- [ ] **Step 3: Implement client schemas, service and routes**

Create `ClientCreate`, `ClientUpdate`, `ClientRead`, and paginated/list response schemas. Implement service functions requiring `tenant_id`:

- `list_clients(db, tenant_id)`
- `create_client(db, tenant_id, payload)`
- `get_client(db, tenant_id, client_id)`
- `update_client(db, tenant_id, client_id, payload)`
- `delete_client(db, tenant_id, client_id)`

Routes must use `current_user.tenant_id` from the auth dependency.

- [ ] **Step 4: Run tests**

Run:

```bash
cd backend
python -m pytest tests/test_clients.py tests/test_tenancy.py -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/clients.py backend/app/services/clients_service.py backend/app/api/routes/clients.py backend/app/api/main.py backend/tests/test_clients.py backend/tests/test_tenancy.py
git commit -m "feat: add tenant scoped clients"
```

## Task 6: Cost Catalog

**Files:**
- Create: `backend/app/schemas/cost_items.py`
- Create: `backend/app/services/cost_items_service.py`
- Create: `backend/app/api/routes/cost_items.py`
- Modify: `backend/app/api/main.py`
- Test: `backend/tests/test_cost_items.py`

- [ ] **Step 1: Write failing catalog tests**

Test that tenant admin can create, list, update and deactivate cost items with categories `equipment`, `materials`, `labor`, `services`. Test that `tax_rate=None` causes the effective tax rate to use `Tenant.default_tax_rate`.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd backend
python -m pytest tests/test_cost_items.py -v
```

Expected: FAIL because cost item routes do not exist.

- [ ] **Step 3: Implement catalog service and routes**

Implement:

- `GET /cost-items?category=equipment`
- `POST /cost-items`
- `PATCH /cost-items/{id}`
- logical delete via `DELETE /cost-items/{id}` setting `is_active=False`

Responses must include `effective_tax_rate`, calculated from item override or tenant default.

- [ ] **Step 4: Run tests**

Run:

```bash
cd backend
python -m pytest tests/test_cost_items.py -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/cost_items.py backend/app/services/cost_items_service.py backend/app/api/routes/cost_items.py backend/app/api/main.py backend/tests/test_cost_items.py
git commit -m "feat: add tenant cost catalog"
```

## Task 7: Quotes API And Historical Item Copy

**Files:**
- Create: `backend/app/schemas/quotes.py`
- Create: `backend/app/services/quotes_service.py`
- Create: `backend/app/api/routes/quotes.py`
- Modify: `backend/app/api/main.py`
- Test: `backend/tests/test_quotes.py`

- [ ] **Step 1: Write failing quote tests**

Tests must cover:

- creating a draft quote for a tenant client;
- adding an item from a cost item;
- copying name, description, category, unit, unit price and tax rate into `QuoteItem`;
- recalculating quote totals;
- changing the source cost item later does not change existing quote item;
- transitions `draft -> issued -> accepted`;
- rejection path `draft -> issued -> rejected`.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd backend
python -m pytest tests/test_quotes.py -v
```

Expected: FAIL because quote service and routes do not exist.

- [ ] **Step 3: Implement quote service**

Implement quote creation, item addition/update/delete, total recalculation through `calculate_quote`, and status transitions. All lookups must include `tenant_id`.

Transition rules:

```python
ALLOWED_TRANSITIONS = {
    QuoteStatus.DRAFT: {QuoteStatus.ISSUED},
    QuoteStatus.ISSUED: {QuoteStatus.ACCEPTED, QuoteStatus.REJECTED},
    QuoteStatus.ACCEPTED: set(),
    QuoteStatus.REJECTED: set(),
}
```

- [ ] **Step 4: Implement quote routes**

Register:

- `GET /quotes`
- `POST /quotes`
- `GET /quotes/{id}`
- `PATCH /quotes/{id}`
- `POST /quotes/{id}/items`
- `PATCH /quotes/{id}/items/{item_id}`
- `DELETE /quotes/{id}/items/{item_id}`
- `POST /quotes/{id}/issue`
- `POST /quotes/{id}/accept`
- `POST /quotes/{id}/reject`

- [ ] **Step 5: Run tests**

Run:

```bash
cd backend
python -m pytest tests/test_quotes.py tests/test_quote_calculator.py -v
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/schemas/quotes.py backend/app/services/quotes_service.py backend/app/api/routes/quotes.py backend/app/api/main.py backend/tests/test_quotes.py
git commit -m "feat: add tenant quote workflow"
```

## Task 8: PDF Generation

**Files:**
- Create: `backend/app/infra/pdf.py`
- Modify: `backend/app/api/routes/quotes.py`
- Test: `backend/tests/test_quote_pdf.py`

- [ ] **Step 1: Write failing PDF test**

Create a test that creates tenant, client, cost item, quote, quote item, issues the quote, calls `GET /quotes/{id}/pdf`, and asserts:

```python
assert response.status_code == 200
assert response.headers["content-type"] == "application/pdf"
assert response.content.startswith(b"%PDF")
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend
python -m pytest tests/test_quote_pdf.py -v
```

Expected: FAIL because PDF endpoint or generator does not exist.

- [ ] **Step 3: Implement ReportLab PDF generator**

Create `build_quote_pdf(tenant, client, quote, items) -> bytes` in `backend/app/infra/pdf.py`. Include tenant, client, quote number/date, item table, subtotal, discount, IVA and total.

- [ ] **Step 4: Wire PDF route**

Add `GET /quotes/{id}/pdf` returning `Response(content=pdf_bytes, media_type="application/pdf")` with `Content-Disposition` filename `presupuesto-{quote.number}.pdf`.

- [ ] **Step 5: Run PDF test**

Run:

```bash
cd backend
python -m pytest tests/test_quote_pdf.py -v
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/infra/pdf.py backend/app/api/routes/quotes.py backend/tests/test_quote_pdf.py
git commit -m "feat: generate quote PDFs"
```

## Task 9: Frontend Scaffold And Auth

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/app/App.tsx`
- Create: `frontend/src/app/routes.tsx`
- Create: `frontend/src/shared/api/client.ts`
- Create: `frontend/src/features/auth/LoginPage.tsx`
- Create: `frontend/src/features/dashboard/DashboardPage.tsx`
- Test: `frontend/src/features/auth/LoginPage.test.tsx`

- [ ] **Step 1: Write failing login render test**

Create a Vitest test asserting the login page renders email, password and submit controls.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd frontend
npm run test:run -- LoginPage.test.tsx
```

Expected: FAIL because frontend does not exist.

- [ ] **Step 3: Scaffold Vite React app**

Create `frontend/package.json` with scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test:run": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

Install dependencies: React, React DOM, Vite, TypeScript, Tailwind, Shadcn-compatible Radix primitives as needed, SweetAlert2, Vitest, Testing Library.

- [ ] **Step 4: Implement auth page and API client**

Implement login form that calls `POST /auth/login`, stores token in localStorage, and routes to dashboard.

- [ ] **Step 5: Run frontend test**

Run:

```bash
cd frontend
npm run test:run -- LoginPage.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend
git commit -m "feat: scaffold React frontend auth"
```

## Task 10: Frontend Clients And Costs

**Files:**
- Create: `frontend/src/features/clients/ClientsPage.tsx`
- Create: `frontend/src/features/clients/clientApi.ts`
- Create: `frontend/src/features/costs/CostsPage.tsx`
- Create: `frontend/src/features/costs/costApi.ts`
- Modify: `frontend/src/app/routes.tsx`
- Test: `frontend/src/features/clients/ClientsPage.test.tsx`
- Test: `frontend/src/features/costs/CostsPage.test.tsx`

- [ ] **Step 1: Write failing render tests**

Tests assert that Clients page renders table headers `Nombre`, `Documento`, `Email`, `Telefono`, and Costs page renders category tabs/elements `Equipos`, `Materiales`, `Mano de obra`, `Servicios`.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd frontend
npm run test:run -- ClientsPage.test.tsx CostsPage.test.tsx
```

Expected: FAIL because pages do not exist.

- [ ] **Step 3: Implement clients and costs pages**

Use tables, compact forms, loading states, error states, and SweetAlert2 confirmation before delete/deactivate. Keep UI operational, not marketing-oriented.

- [ ] **Step 4: Run tests**

Run:

```bash
cd frontend
npm run test:run -- ClientsPage.test.tsx CostsPage.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/clients frontend/src/features/costs frontend/src/app/routes.tsx
git commit -m "feat: add clients and costs UI"
```

## Task 11: Frontend Quotes Workflow

**Files:**
- Create: `frontend/src/features/quotes/QuotesPage.tsx`
- Create: `frontend/src/features/quotes/QuoteEditorPage.tsx`
- Create: `frontend/src/features/quotes/quoteApi.ts`
- Modify: `frontend/src/app/routes.tsx`
- Test: `frontend/src/features/quotes/QuoteEditorPage.test.tsx`

- [ ] **Step 1: Write failing quote editor test**

Test that quote editor renders client selector, item area, subtotal, IVA, total, and state actions `Emitir`, `Aceptar`, `Rechazar`.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd frontend
npm run test:run -- QuoteEditorPage.test.tsx
```

Expected: FAIL because quote editor does not exist.

- [ ] **Step 3: Implement quote list and editor**

Implement:

- quote listing by status;
- quote creation;
- item addition from cost catalog;
- quantity, price, discount and IVA editing;
- visible totals;
- state transition actions;
- PDF download link/button.

- [ ] **Step 4: Run test**

Run:

```bash
cd frontend
npm run test:run -- QuoteEditorPage.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/quotes frontend/src/app/routes.tsx
git commit -m "feat: add quote workflow UI"
```

## Task 12: Docker, Environment, README

**Files:**
- Create: `docker-compose.yml`
- Create: `backend/Dockerfile`
- Create: `frontend/Dockerfile`
- Create: `.env.example`
- Create: `README.md`
- Test: manual Docker smoke

- [ ] **Step 1: Write expected local run contract**

Add to `README.md`:

```markdown
## Local Development

1. Copy `.env.example` to `.env`.
2. Run `docker compose up --build`.
3. Open frontend at `http://localhost:5173`.
4. Backend health is available at `http://localhost:8000/health`.
```

- [ ] **Step 2: Add Docker files**

Compose services:

- `db`: postgres
- `backend`: FastAPI on port 8000
- `frontend`: Vite on port 5173

Environment variables:

```env
DATABASE_URL=postgresql+psycopg://presupuestos:presupuestos@db:5432/presupuestos
JWT_SECRET=change-me
VITE_API_URL=http://localhost:8000
```

- [ ] **Step 3: Run Docker smoke**

Run:

```bash
docker compose up --build
```

Expected:

- backend starts on `http://localhost:8000`;
- frontend starts on `http://localhost:5173`;
- Postgres accepts connections;
- `GET /health` returns `{"status":"ok"}`.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml backend/Dockerfile frontend/Dockerfile .env.example README.md
git commit -m "chore: add portable Docker setup"
```

## Task 13: Full Verification

**Files:**
- Modify only files needed to fix defects found during verification.

- [ ] **Step 1: Run backend test suite**

Run:

```bash
cd backend
python -m pytest -v
```

Expected: PASS.

- [ ] **Step 2: Run frontend test suite**

Run:

```bash
cd frontend
npm run test:run
npm run typecheck
npm run build
```

Expected: PASS for all commands.

- [ ] **Step 3: Verify tenant isolation manually through API**

Create two tenants, login as both, create one client/cost/quote per tenant, and confirm each tenant only sees its own data.

- [ ] **Step 4: Verify browser workflow**

Run the app and verify:

1. login;
2. create client;
3. create cost item in each category;
4. create quote;
5. add item from catalog;
6. edit quantity/IVA/discount;
7. issue quote;
8. download PDF;
9. accept or reject quote.

- [ ] **Step 5: Commit fixes if needed**

```bash
git add backend frontend docker-compose.yml README.md
git commit -m "fix: complete MVP verification"
```

Skip this commit if no fixes were needed.

## Self-Review

Spec coverage:

- Multitenant tenant/user model: Tasks 2, 4, 5.
- Manual tenant admin creation: Task 4.
- Clients: Task 5 and Task 10.
- Cost categories and IVA default/override: Task 6 and Task 10.
- Quote calculations and historical item copy: Tasks 3 and 7.
- Quote states: Task 7 and Task 11.
- PDF generation: Task 8.
- Frontend app: Tasks 9, 10, 11.
- Docker/Railway/Proxmox portability: Task 12.
- Verification: Task 13.

Placeholder scan: no task uses unresolved marker text as acceptance criteria. Where implementation details are broad, the task names exact files, behavior, commands, and expected test results.

Type consistency:

- Cost categories use `equipment`, `materials`, `labor`, `services`.
- Quote states use `draft`, `issued`, `accepted`, `rejected`.
- Tenant scope is always `tenant_id`.
- Monetary values use `Decimal` on backend.
