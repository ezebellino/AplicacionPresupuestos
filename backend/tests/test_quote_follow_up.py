from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select
from app.infra.models import AuditEvent

from conftest import create_tenant_and_login
from test_quotes import create_client, create_quote


def setup_quote(client):
    headers = create_tenant_and_login(client, name="Follow up", email="follow@example.test")
    customer = create_client(client, headers)
    quote = create_quote(client, headers, customer["id"])
    return headers, quote


@pytest.mark.parametrize("days", [1, 3, 7])
def test_snooze_persists_without_changing_business_data(api_context, days):
    client, sessions = api_context
    headers, quote = setup_quote(client)
    url = f"/quotes/{quote['id']}"
    issued = client.post(url + "/issue", headers=headers).json()
    before = datetime.now(timezone.utc)
    response = client.post(url + "/follow-up", headers=headers, json={"days": days})
    assert response.status_code == 200
    updated = response.json()
    due = datetime.fromisoformat(updated["follow_up_at"]).replace(tzinfo=timezone.utc)
    assert before + timedelta(days=days) <= due <= datetime.now(timezone.utc) + timedelta(days=days)
    for field in ("status", "issued_at", "total", "items", "number"):
        assert updated[field] == issued[field]
    assert client.get(url, headers=headers).json()["follow_up_at"] == updated["follow_up_at"]
    assert client.get("/quotes", headers=headers).json()["items"][0]["follow_up_at"] == updated["follow_up_at"]
    with sessions() as db:
        event = db.scalar(select(AuditEvent).where(AuditEvent.action == "follow_up_snoozed"))
        assert event is not None
        assert event.metadata_json["days"] == days


@pytest.mark.parametrize("payload", [{"days": x} for x in [0, 2, -1, 8, "3", True, None]] + [{"days": 3, "tenant_id": "other"}])
def test_snooze_rejects_invalid_payload(api_context, payload):
    client, _ = api_context
    headers, quote = setup_quote(client)
    assert client.post(f"/quotes/{quote['id']}/follow-up", headers=headers, json=payload).status_code == 422


@pytest.mark.parametrize("transition", ["accept", "reject"])
def test_snooze_only_issued_and_cleared_after_response(api_context, transition):
    client, _ = api_context
    headers, quote = setup_quote(client)
    url = f"/quotes/{quote['id']}"
    assert client.post(url + "/follow-up", headers=headers, json={"days": 3}).status_code == 409
    client.post(url + "/issue", headers=headers)
    assert client.post(url + "/follow-up", headers=headers, json={"days": 3}).status_code == 200
    response = client.post(url + "/" + transition, headers=headers)
    assert response.status_code == 200
    assert response.json()["follow_up_at"] is None
    assert client.post(url + "/follow-up", headers=headers, json={"days": 3}).status_code == 409


def test_snooze_requires_owner_and_authentication(api_context):
    client, _ = api_context
    headers, quote = setup_quote(client)
    other = create_tenant_and_login(client, name="Other", email="other@example.test")
    url = f"/quotes/{quote['id']}"
    client.post(url + "/issue", headers=headers)
    assert client.post(url + "/follow-up", json={"days": 3}).status_code == 401
    assert client.post(url + "/follow-up", headers=other, json={"days": 3}).status_code == 404
    assert client.get(url, headers=headers).json()["follow_up_at"] is None
