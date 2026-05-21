from fastapi.testclient import TestClient

from app.api.main import app
from app.core.config import Settings


def test_health_endpoint_returns_ok():
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_settings_normalize_railway_postgres_url():
    settings = Settings(
        database_url="postgresql://postgres:secret@postgres.railway.internal:5432/railway"
    )

    assert settings.sqlalchemy_database_url == "postgresql+psycopg://postgres:secret@postgres.railway.internal:5432/railway"
