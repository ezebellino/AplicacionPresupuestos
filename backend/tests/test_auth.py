from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.main import app
from app.infra.db import Base, get_db


def test_tenant_admin_can_login_and_read_current_user() -> None:
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
        client = TestClient(app)

        create_response = client.post(
            "/admin/tenants",
            json={
                "name": "Acme Clima",
                "admin_email": "admin@acme.test",
                "admin_password": "correct-horse-battery-staple",
            },
        )

        assert create_response.status_code == 201

        token_response = client.post(
            "/auth/login",
            json={
                "email": "admin@acme.test",
                "password": "correct-horse-battery-staple",
            },
        )

        assert token_response.status_code == 200
        assert token_response.json()["access_token"]

        me_response = client.get(
            "/auth/me",
            headers={
                "Authorization": f"Bearer {token_response.json()['access_token']}",
            },
        )

        assert me_response.status_code == 200
        assert me_response.json()["email"] == "admin@acme.test"
        assert me_response.json()["role"] == "admin"
        assert me_response.json()["tenant"]["name"] == "Acme Clima"
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(engine)
        engine.dispose()
