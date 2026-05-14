from fastapi.testclient import TestClient

from app.api.main import app


def test_frontend_origin_can_preflight_login() -> None:
    client = TestClient(app)

    response = client.options(
        "/auth/login",
        headers={
            "Access-Control-Request-Headers": "content-type",
            "Access-Control-Request-Method": "POST",
            "Origin": "http://localhost:50111",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:50111"
    assert "POST" in response.headers["access-control-allow-methods"]
