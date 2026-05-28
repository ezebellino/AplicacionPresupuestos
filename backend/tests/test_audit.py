from sqlalchemy import select

from conftest import create_tenant_and_login, login

from app.infra.models import AuditEvent


def _events(SessionLocal):
    with SessionLocal() as db:
        return list(db.scalars(select(AuditEvent).order_by(AuditEvent.created_at, AuditEvent.id)))


def test_successful_login_creates_audit_event(api_context) -> None:
    client, SessionLocal = api_context
    create_response = client.post(
        "/admin/tenants",
        json={
            "name": "Acme Clima",
            "admin_email": "audit-login@acme.test",
            "admin_password": "correct-horse-battery-staple",
        },
    )
    assert create_response.status_code == 201

    response = login(client, email="audit-login@acme.test")

    assert response.status_code == 200

    events = _events(SessionLocal)
    assert len(events) == 1
    assert events[0].entity_type == "auth"
    assert events[0].action == "login_succeeded"
    assert events[0].actor_email == "audit-login@acme.test"


def test_client_lifecycle_writes_audit_events(api_context) -> None:
    client, SessionLocal = api_context
    headers = create_tenant_and_login(client, name="Acme Clima", email="audit-client@acme.test")

    create_response = client.post(
        "/clients",
        headers=headers,
        json={"name": "Cliente Auditado", "phone": "12345", "address": "Dolores"},
    )
    assert create_response.status_code == 201
    client_id = create_response.json()["id"]

    update_response = client.patch(
        f"/clients/{client_id}",
        headers=headers,
        json={"email": "cliente@audit.test"},
    )
    assert update_response.status_code == 200

    delete_response = client.delete(f"/clients/{client_id}", headers=headers)
    assert delete_response.status_code == 204

    events = _events(SessionLocal)
    lifecycle_events = [event for event in events if event.entity_type == "client"]
    assert [event.action for event in lifecycle_events] == ["created", "updated", "deleted"]
    assert lifecycle_events[0].summary == "Cliente creado: Cliente Auditado"


def test_quote_status_and_bulk_delete_write_audit_events(api_context) -> None:
    client, SessionLocal = api_context
    headers = create_tenant_and_login(client, name="Acme Clima", email="audit-quote@acme.test")

    client_response = client.post("/clients", headers=headers, json={"name": "Cliente Quote"})
    assert client_response.status_code == 201
    quote_response = client.post(
        "/quotes",
        headers=headers,
        json={"client_id": client_response.json()["id"], "title": "Presupuesto auditado"},
    )
    assert quote_response.status_code == 201
    quote_id = quote_response.json()["id"]

    issue_response = client.post(f"/quotes/{quote_id}/issue", headers=headers)
    assert issue_response.status_code == 200

    accept_response = client.post(f"/quotes/{quote_id}/accept", headers=headers)
    assert accept_response.status_code == 200

    bulk_delete_response = client.post("/quotes/bulk-delete", headers=headers, json={"quote_ids": [quote_id]})
    assert bulk_delete_response.status_code == 200
    assert bulk_delete_response.json()["deleted_count"] == 1

    events = [event for event in _events(SessionLocal) if event.entity_type == "quote"]
    assert [event.action for event in events] == ["created", "issued", "accepted", "deleted"]


def test_signup_and_membership_actions_write_platform_audit_events(api_context) -> None:
    client, SessionLocal = api_context
    platform_headers = create_tenant_and_login(
        client,
        name="FacturEasy",
        email="platform-admin@factureasy.test",
    )

    with SessionLocal() as db:
        from app.infra.models import CostItem, User
        from app.domain.enums import CostCategory

        platform_admin = db.scalar(select(User).where(User.email == "platform-admin@factureasy.test"))
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
            "company_name": "Empresa Auditada",
            "contact_name": "Contacto",
            "email": "empresa-auditada@test.com",
            "phone": "2245123456",
        },
    )
    assert signup_response.status_code == 201
    request_id = signup_response.json()["id"]

    approve_response = client.post(
        f"/admin/tenants/platform/signup-requests/{request_id}/approve",
        headers=platform_headers,
        json={"admin_password": "correct-horse-battery-staple", "review_notes": "Alta aprobada"},
    )
    assert approve_response.status_code == 200
    tenant_id = approve_response.json()["created_tenant_id"]

    membership_response = client.post(
        f"/admin/tenants/platform/memberships/{tenant_id}/paid",
        headers=platform_headers,
        json={"months_covered": 1, "amount": "10000.00", "notes": "Primer pago"},
    )
    assert membership_response.status_code == 200

    events = _events(SessionLocal)
    signup_events = [event.action for event in events if event.entity_type == "tenant_signup_request"]
    membership_events = [event.action for event in events if event.entity_type == "membership_payment"]
    assert signup_events == ["created", "approved"]
    assert membership_events == ["created"]


def test_platform_admin_can_list_audit_events_with_filters(api_context) -> None:
    client, SessionLocal = api_context
    platform_headers = create_tenant_and_login(
        client,
        name="FacturEasy",
        email="platform-audit-list@factureasy.test",
    )

    with SessionLocal() as db:
        from app.infra.models import User

        platform_admin = db.scalar(select(User).where(User.email == "platform-audit-list@factureasy.test"))
        assert platform_admin is not None
        platform_admin.role = "platform_admin"
        db.commit()

    tenant_headers = create_tenant_and_login(client, name="DM Refrigeracion", email="tenant-audit@test.com")
    create_response = client.post("/clients", headers=tenant_headers, json={"name": "Cliente Auditado"})
    assert create_response.status_code == 201

    forbidden_response = client.get("/admin/tenants/platform/audit-events", headers=tenant_headers)
    assert forbidden_response.status_code == 403

    listed = client.get(
        "/admin/tenants/platform/audit-events?entity_type=client&action=created",
        headers=platform_headers,
    )
    assert listed.status_code == 200
    assert listed.json()["items"]
    assert listed.json()["items"][0]["entity_type"] == "client"
    assert listed.json()["items"][0]["action"] == "created"
