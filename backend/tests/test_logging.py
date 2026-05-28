from fastapi import APIRouter

from app.api import middleware as logging_middleware
from app.api.main import app


def test_health_response_includes_request_id(api_context) -> None:
    client, _ = api_context

    response = client.get("/health")

    assert response.status_code == 200
    assert response.headers["X-Request-ID"]


def test_request_logs_are_structured_json(api_context, monkeypatch) -> None:
    client, _ = api_context
    captured: list[dict] = []

    def _capture(_logger, *, level=20, event: str, **fields):
        captured.append({"event": event, **fields})

    monkeypatch.setattr(logging_middleware, "log_event", _capture)

    response = client.get("/health")

    assert response.status_code == 200
    assert [record["event"] for record in captured] == ["request_started", "request_completed"]
    assert captured[0]["path"] == "/health"
    assert captured[1]["status_code"] == 200
    assert captured[1]["request_id"] == response.headers["X-Request-ID"]


def test_request_failed_log_is_emitted_for_unhandled_errors(api_context, monkeypatch) -> None:
    client, _ = api_context
    captured: list[dict] = []

    def _capture(_logger, *, level=20, event: str, **fields):
        captured.append({"event": event, **fields})

    monkeypatch.setattr(logging_middleware, "log_event", _capture)

    router = APIRouter()

    @router.get("/_test/error")
    def _raise_error():
        raise RuntimeError("boom")

    app.include_router(router)

    try:
        try:
            client.get("/_test/error")
        except RuntimeError:
            pass

        assert captured[-1]["event"] == "request_failed"
        assert captured[-1]["path"] == "/_test/error"
        assert captured[-1]["error_type"] == "RuntimeError"
    finally:
        app.router.routes.pop()
