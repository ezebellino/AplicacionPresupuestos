from sqlalchemy import select

from conftest import create_tenant_and_login, login

from app.api.routes import auth as auth_routes
from app.api.routes import quotes as quote_routes
from app.api.routes import tenants as tenant_routes
from app.domain.enums import CostCategory
from app.infra.models import CostItem, User
from app.services import quotes_service, tenants_service


def test_login_route_emits_technical_auth_logs(api_context, monkeypatch) -> None:
    client, _ = api_context
    client.post(
        "/admin/tenants",
        json={
            "name": "Acme Clima",
            "admin_email": "log-auth@acme.test",
            "admin_password": "correct-horse-battery-staple",
        },
    )
    captured: list[dict[str, object]] = []

    def _capture(_logger, *, event: str, **fields: object) -> None:
        captured.append({"event": event, **fields})

    monkeypatch.setattr(auth_routes, "log_business_event", _capture)

    success_response = login(client, email="log-auth@acme.test")
    failed_response = login(client, email="log-auth@acme.test", password="bad-password")

    assert success_response.status_code == 200
    assert failed_response.status_code == 401
    assert [event["event"] for event in captured] == [
        "auth_login_succeeded",
        "auth_login_failed",
    ]
    assert captured[0]["actor_email"] == "log-auth@acme.test"
    assert captured[0]["actor_role"] == "admin"
    assert captured[1]["actor_email"] == "log-auth@acme.test"


def test_quote_issue_and_bulk_delete_emit_technical_business_logs(api_context, monkeypatch) -> None:
    client, _ = api_context
    headers = create_tenant_and_login(client, name="Acme Clima", email="log-quote@acme.test")
    captured: list[dict[str, object]] = []

    def _capture(_logger, *, event: str, **fields: object) -> None:
        captured.append({"event": event, **fields})

    monkeypatch.setattr(quotes_service, "log_business_event", _capture)

    client_response = client.post("/clients", headers=headers, json={"name": "Cliente Logs"})
    assert client_response.status_code == 201
    quote_response = client.post(
        "/quotes",
        headers=headers,
        json={"client_id": client_response.json()["id"], "title": "Presupuesto tecnico"},
    )
    assert quote_response.status_code == 201
    quote_id = quote_response.json()["id"]

    issue_response = client.post(f"/quotes/{quote_id}/issue", headers=headers)
    delete_response = client.post("/quotes/bulk-delete", headers=headers, json={"quote_ids": [quote_id]})

    assert issue_response.status_code == 200
    assert delete_response.status_code == 200
    assert [event["event"] for event in captured] == ["quote_issued", "quote_bulk_deleted"]
    assert captured[0]["quote_number"] == "Q-000001"
    assert captured[1]["quote_count"] == 1
    assert captured[1]["quote_numbers"] == ["Q-000001"]


def test_quote_issue_conflict_emits_rejection_log(api_context, monkeypatch) -> None:
    client, _ = api_context
    headers = create_tenant_and_login(client, name="Acme Clima", email="log-quote-conflict@acme.test")
    captured: list[dict[str, object]] = []

    def _capture(_logger, *, level=20, event: str, **fields: object) -> None:
        captured.append({"event": event, "level": level, **fields})

    monkeypatch.setattr(quote_routes, "log_business_failure", _capture)

    client_response = client.post("/clients", headers=headers, json={"name": "Cliente Conflictivo"})
    assert client_response.status_code == 201
    quote_response = client.post(
        "/quotes",
        headers=headers,
        json={"client_id": client_response.json()["id"], "title": "Presupuesto emitido"},
    )
    assert quote_response.status_code == 201
    quote_id = quote_response.json()["id"]

    first_issue = client.post(f"/quotes/{quote_id}/issue", headers=headers)
    second_issue = client.post(f"/quotes/{quote_id}/issue", headers=headers)

    assert first_issue.status_code == 200
    assert second_issue.status_code == 409
    assert [event["event"] for event in captured] == ["quote_issue_rejected"]
    assert captured[0]["reason"] == "Quote can only be issued from draft"


def test_platform_signup_review_and_membership_payment_emit_technical_business_logs(
    api_context,
    monkeypatch,
) -> None:
    client, SessionLocal = api_context
    platform_headers = create_tenant_and_login(
        client,
        name="FacturEasy",
        email="platform-tech@factureasy.test",
    )
    captured: list[dict[str, object]] = []

    def _capture(_logger, *, event: str, **fields: object) -> None:
        captured.append({"event": event, **fields})

    monkeypatch.setattr(tenants_service, "log_business_event", _capture)

    with SessionLocal() as db:
        platform_admin = db.scalar(select(User).where(User.email == "platform-tech@factureasy.test"))
        assert platform_admin is not None
        platform_admin.role = "platform_admin"
        db.add(
            CostItem(
                tenant_id=platform_admin.tenant_id,
                category=CostCategory.SERVICES,
                name="Membresia mensual FacturEasy",
                description="Abono mensual",
                unit="unit",
                unit_cost="10000.00",
                tax_rate="21.00",
            )
        )
        db.commit()

    signup_response = client.post(
        "/admin/tenants/signup-requests",
        json={
            "company_name": "Empresa Logueada",
            "contact_name": "Diego",
            "email": "empresa-log@test.com",
            "phone": "2245000000",
        },
    )
    assert signup_response.status_code == 201
    signup_id = signup_response.json()["id"]

    contacted_response = client.post(
        f"/admin/tenants/platform/signup-requests/{signup_id}/contacted",
        headers=platform_headers,
        json={"review_notes": "Primer contacto"},
    )
    assert contacted_response.status_code == 200

    approved_response = client.post(
        f"/admin/tenants/platform/signup-requests/{signup_id}/approve",
        headers=platform_headers,
        json={"admin_password": "correct-horse-battery-staple"},
    )
    assert approved_response.status_code == 409

    fresh_signup = client.post(
        "/admin/tenants/signup-requests",
        json={
            "company_name": "Empresa Activa",
            "contact_name": "Lucia",
            "email": "empresa-activa@test.com",
            "phone": "2245111111",
        },
    )
    assert fresh_signup.status_code == 201

    approve_fresh_response = client.post(
        f"/admin/tenants/platform/signup-requests/{fresh_signup.json()['id']}/approve",
        headers=platform_headers,
        json={"admin_password": "correct-horse-battery-staple"},
    )
    assert approve_fresh_response.status_code == 200
    tenant_id = approve_fresh_response.json()["created_tenant_id"]

    membership_response = client.post(
        f"/admin/tenants/platform/memberships/{tenant_id}/paid",
        headers=platform_headers,
        json={"months_covered": 1, "amount": "10000.00", "notes": "Primer pago"},
    )
    assert membership_response.status_code == 200

    assert [event["event"] for event in captured] == [
        "platform_signup_request_status_updated",
        "platform_signup_request_approved",
        "platform_membership_payment_created",
    ]
    assert captured[0]["signup_status"] == "contacted"
    assert captured[1]["created_admin_email"] == "empresa-activa@test.com"
    assert captured[2]["quote_number"] is not None


def test_platform_signup_approve_conflict_emits_rejection_log(api_context, monkeypatch) -> None:
    client, SessionLocal = api_context
    platform_headers = create_tenant_and_login(
        client,
        name="FacturEasy",
        email="platform-reject@factureasy.test",
    )
    captured: list[dict[str, object]] = []

    def _capture(_logger, *, level=20, event: str, **fields: object) -> None:
        captured.append({"event": event, "level": level, **fields})

    monkeypatch.setattr(tenant_routes, "log_business_failure", _capture)

    with SessionLocal() as db:
        platform_admin = db.scalar(select(User).where(User.email == "platform-reject@factureasy.test"))
        assert platform_admin is not None
        platform_admin.role = "platform_admin"
        db.commit()

    signup_response = client.post(
        "/admin/tenants/signup-requests",
        json={
            "company_name": "Empresa En Seguimiento",
            "contact_name": "Sofia",
            "email": "empresa-seguimiento@test.com",
            "phone": "2245222222",
        },
    )
    assert signup_response.status_code == 201

    contacted_response = client.post(
        f"/admin/tenants/platform/signup-requests/{signup_response.json()['id']}/contacted",
        headers=platform_headers,
        json={"review_notes": "Se pidio mas informacion"},
    )
    approve_response = client.post(
        f"/admin/tenants/platform/signup-requests/{signup_response.json()['id']}/approve",
        headers=platform_headers,
        json={"admin_password": "correct-horse-battery-staple"},
    )

    assert contacted_response.status_code == 200
    assert approve_response.status_code == 409
    assert [event["event"] for event in captured] == ["platform_signup_request_approve_rejected"]
    assert captured[0]["reason"] == "request is not pending"


def test_platform_change_request_review_emits_technical_business_logs(api_context, monkeypatch) -> None:
    client, SessionLocal = api_context
    platform_headers = create_tenant_and_login(
        client,
        name="FacturEasy",
        email="platform-review@factureasy.test",
    )
    tenant_headers = create_tenant_and_login(
        client,
        name="DM Refrigeracion",
        email="tenant-review@dm.test",
    )
    captured: list[dict[str, object]] = []

    def _capture(_logger, *, event: str, **fields: object) -> None:
        captured.append({"event": event, **fields})

    monkeypatch.setattr(tenants_service, "log_business_event", _capture)

    with SessionLocal() as db:
        platform_admin = db.scalar(select(User).where(User.email == "platform-review@factureasy.test"))
        assert platform_admin is not None
        platform_admin.role = "platform_admin"
        db.commit()

    change_response = client.post(
        "/admin/tenants/me/change-requests",
        headers=tenant_headers,
        json={"proposed_name": "DM Refrigeracion SRL", "reason": "Regularizacion fiscal"},
    )
    assert change_response.status_code == 201

    approve_response = client.post(
        f"/admin/tenants/platform/change-requests/{change_response.json()['id']}/approve",
        headers=platform_headers,
        json={"review_notes": "Aprobado"},
    )

    assert approve_response.status_code == 200
    assert [event["event"] for event in captured] == ["platform_tenant_change_request_approved"]
    assert captured[0]["tenant_name"] == "DM Refrigeracion SRL"
