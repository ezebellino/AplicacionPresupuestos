from collections.abc import Generator
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.main import app
from app.core.config import settings
from app.infra.db import Base, get_db
from app.infra.models import User


ADMIN_EMAIL = "admin@acme.test"
ADMIN_PASSWORD = "correct-horse-battery-staple"


@pytest.fixture
def auth_context() -> Generator[tuple[TestClient, sessionmaker[Session]], None, None]:
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


def create_admin_tenant(
    client: TestClient,
    *,
    name: str = "Acme Clima",
    email: str = ADMIN_EMAIL,
    password: str = ADMIN_PASSWORD,
):
    return client.post(
        "/admin/tenants",
        json={
            "name": name,
            "admin_email": email,
            "admin_password": password,
        },
    )


def login(
    client: TestClient,
    *,
    email: str = ADMIN_EMAIL,
    password: str = ADMIN_PASSWORD,
):
    return client.post(
        "/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )


def bearer_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def admin_user(SessionLocal: sessionmaker[Session]) -> User:
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == ADMIN_EMAIL))

        assert user is not None
        return user


def set_admin_active(SessionLocal: sessionmaker[Session], is_active: bool) -> None:
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == ADMIN_EMAIL))

        assert user is not None
        user.is_active = is_active
        db.commit()


def encode_token(payload: dict[str, Any]) -> str:
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def assert_no_password_hash(value: Any) -> None:
    if isinstance(value, dict):
        assert "password_hash" not in value
        for child in value.values():
            assert_no_password_hash(child)
    elif isinstance(value, list):
        for child in value:
            assert_no_password_hash(child)


def test_tenant_admin_can_login_and_read_current_user(auth_context) -> None:
    client, _ = auth_context

    create_response = create_admin_tenant(client)

    assert create_response.status_code == 201

    token_response = login(client)

    assert token_response.status_code == 200
    assert token_response.json()["access_token"]

    me_response = client.get(
        "/auth/me",
        headers=bearer_headers(token_response.json()["access_token"]),
    )

    assert me_response.status_code == 200
    assert me_response.json()["email"] == ADMIN_EMAIL
    assert me_response.json()["role"] == "admin"
    assert me_response.json()["tenant"]["name"] == "Acme Clima"


def test_invalid_password_returns_401(auth_context) -> None:
    client, _ = auth_context
    create_admin_tenant(client)

    response = login(client, password="wrong-password")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_missing_token_on_current_user_returns_401(auth_context) -> None:
    client, _ = auth_context

    response = client.get("/auth/me")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_invalid_authorization_scheme_returns_401(auth_context) -> None:
    client, _ = auth_context

    response = client.get("/auth/me", headers={"Authorization": "Basic abc123"})

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_malformed_token_on_current_user_returns_401(auth_context) -> None:
    client, _ = auth_context

    response = client.get("/auth/me", headers=bearer_headers("not-a-jwt"))

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_expired_token_returns_401(auth_context) -> None:
    client, SessionLocal = auth_context
    create_admin_tenant(client)
    user = admin_user(SessionLocal)
    token = encode_token(
        {
            "sub": str(user.id),
            "tenant_id": str(user.tenant_id),
            "email": user.email,
            "role": user.role,
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
        }
    )

    response = client.get("/auth/me", headers=bearer_headers(token))

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_token_with_tenant_id_mismatch_returns_401(auth_context) -> None:
    client, SessionLocal = auth_context
    create_admin_tenant(client)
    user = admin_user(SessionLocal)
    token = encode_token(
        {
            "sub": str(user.id),
            "tenant_id": str(uuid4()),
            "email": user.email,
            "role": user.role,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        }
    )

    response = client.get("/auth/me", headers=bearer_headers(token))

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_inactive_user_login_returns_401(auth_context) -> None:
    client, SessionLocal = auth_context
    create_admin_tenant(client)
    set_admin_active(SessionLocal, False)

    response = login(client)

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_inactive_user_token_use_returns_401(auth_context) -> None:
    client, SessionLocal = auth_context
    create_admin_tenant(client)
    token_response = login(client)
    set_admin_active(SessionLocal, False)

    response = client.get(
        "/auth/me",
        headers=bearer_headers(token_response.json()["access_token"]),
    )

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_duplicate_admin_email_on_tenant_creation_returns_409(auth_context) -> None:
    client, _ = auth_context
    first_response = create_admin_tenant(client)

    duplicate_response = create_admin_tenant(client, name="Other Tenant")

    assert first_response.status_code == 201
    assert duplicate_response.status_code == 409


def test_password_hash_is_not_returned_from_auth_responses(auth_context) -> None:
    client, _ = auth_context

    create_response = create_admin_tenant(client)
    token_response = login(client)
    me_response = client.get(
        "/auth/me",
        headers=bearer_headers(token_response.json()["access_token"]),
    )

    assert create_response.status_code == 201
    assert me_response.status_code == 200
    assert_no_password_hash(create_response.json())
    assert_no_password_hash(me_response.json())
