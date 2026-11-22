from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.main import app
from app.core.security import create_access_token
from app.infra.db import Base, get_db
from app.infra.models import User
from app.schemas.tenants import TenantCreate
from app.services.tenants_service import create_tenant_with_admin


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
def api_context() -> Generator[tuple[TestClient, sessionmaker[Session]], None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    try:
        yield TestClient(app), TestingSessionLocal
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(engine)
        engine.dispose()


def bootstrap_platform_headers(client: TestClient) -> dict[str, str]:
    """Seed an isolated test platform identity without bypassing API authorization."""
    sessions = client.app.dependency_overrides[get_db]()
    db = next(sessions)
    try:
        user = db.scalar(select(User).where(User.email == "bootstrap-platform@example.test"))
        if user is None:
            _, user = create_tenant_with_admin(
                db,
                TenantCreate(
                    name="Test platform",
                    admin_email="bootstrap-platform@example.test",
                    admin_password="test-platform-bootstrap-password",
                ),
            )
            user.role = "platform_admin"
            db.commit()
        token = create_access_token(user.id, user.tenant_id, user.email, user.role)
        return auth_headers(token)
    finally:
        sessions.close()


def create_admin_tenant(
    client: TestClient,
    *,
    name: str,
    email: str,
    password: str = "correct-horse-battery-staple",
):
    return client.post(
        "/admin/tenants",
        headers=bootstrap_platform_headers(client),
        json={
            "name": name,
            "admin_email": email,
            "admin_password": password,
        },
    )


def login(
    client: TestClient,
    *,
    email: str,
    password: str = "correct-horse-battery-staple",
):
    return client.post(
        "/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def create_tenant_and_login(
    client: TestClient,
    *,
    name: str,
    email: str,
    password: str = "correct-horse-battery-staple",
) -> dict[str, str]:
    create_response = create_admin_tenant(
        client,
        name=name,
        email=email,
        password=password,
    )
    assert create_response.status_code == 201

    login_response = login(client, email=email, password=password)
    assert login_response.status_code == 200

    return auth_headers(login_response.json()["access_token"])
