from datetime import date

from conftest import create_tenant_and_login
from sqlalchemy import select

from app.infra.models import User


def test_tenant_profile_update_does_not_accept_fiscal_fields(api_context) -> None:
    client, _ = api_context
    headers = create_tenant_and_login(
        client,
        name="DM Refrigeracion",
        email="admin@dm.test",
    )

    response = client.patch(
        "/admin/tenants/me",
        headers=headers,
        json={
            "name": "Otra Empresa",
            "legal_name": "Otra SRL",
            "tax_id": "30-999",
            "address": "Salta 123",
        },
    )

    assert response.status_code == 200
    assert response.json()["name"] == "DM Refrigeracion"
    assert response.json()["legal_name"] is None
    assert response.json()["tax_id"] is None
    assert response.json()["address"] == "Salta 123"


def test_tenant_profile_update_accepts_large_embedded_logo(api_context) -> None:
    client, _ = api_context
    headers = create_tenant_and_login(
        client,
        name="DM Refrigeracion",
        email="admin-logo@dm.test",
    )

    logo_payload = "data:image/png;base64," + ("A" * 6000)

    response = client.patch(
        "/admin/tenants/me",
        headers=headers,
        json={
            "phone": "2245476329",
            "email": "walteroscardomecq@hotmail.com",
            "invoice_notes": "Gracias por confiar en nuestro Trabajo!",
            "default_tax_rate": "0.00",
            "logo_url": logo_payload,
        },
    )

    assert response.status_code == 200
    assert response.json()["logo_url"] == logo_payload


def test_tenant_admin_can_create_fiscal_change_request(api_context) -> None:
    client, _ = api_context
    headers = create_tenant_and_login(
        client,
        name="DM Refrigeracion",
        email="admin@dm.test",
    )

    response = client.post(
        "/admin/tenants/me/change-requests",
        headers=headers,
        json={
            "proposed_name": "DM Refrigeracion Nueva",
            "proposed_legal_name": "DM Refrigeracion SRL",
            "proposed_tax_id": "30-12345678-9",
            "reason": "Alta fiscal definitiva",
        },
    )

    assert response.status_code == 201
    assert response.json()["status"] == "pending"
    assert response.json()["current_name"] == "DM Refrigeracion"
    assert response.json()["proposed_tax_id"] == "30-12345678-9"

    list_response = client.get("/admin/tenants/me/change-requests", headers=headers)

    assert list_response.status_code == 200
    assert len(list_response.json()["items"]) == 1


def test_tenant_change_request_requires_a_fiscal_field(api_context) -> None:
    client, _ = api_context
    headers = create_tenant_and_login(
        client,
        name="DM Refrigeracion",
        email="admin@dm.test",
    )

    response = client.post(
        "/admin/tenants/me/change-requests",
        headers=headers,
        json={"reason": "Sin cambios"},
    )

    assert response.status_code == 422


def test_public_signup_request_and_platform_review(api_context) -> None:
    client, SessionLocal = api_context
    platform_headers = create_tenant_and_login(
        client,
        name="FacturEasy",
        email="platform@factureasy.test",
    )

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == "platform@factureasy.test"))
        assert user is not None
        user.role = "platform_admin"
        db.commit()

    signup = client.post(
        "/admin/tenants/signup-requests",
        json={
            "company_name": "DM Refrigeracion",
            "contact_name": "Diego",
            "email": "dm@test.com",
            "phone": "3515550101",
            "business_type": "Refrigeracion",
        },
    )

    assert signup.status_code == 201
    assert signup.json()["status"] == "pending"

    listed = client.get("/admin/tenants/platform/signup-requests", headers=platform_headers)

    assert listed.status_code == 200
    assert len(listed.json()["items"]) == 1

    contacted = client.post(
        f"/admin/tenants/platform/signup-requests/{signup.json()['id']}/contacted",
        headers=platform_headers,
        json={"review_notes": "Contactado por WhatsApp"},
    )

    assert contacted.status_code == 200
    assert contacted.json()["status"] == "contacted"


def test_platform_admin_can_create_account_from_signup_request(api_context) -> None:
    client, SessionLocal = api_context
    platform_headers = create_tenant_and_login(
        client,
        name="FacturEasy",
        email="platform@factureasy.test",
    )

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == "platform@factureasy.test"))
        assert user is not None
        user.role = "platform_admin"
        db.commit()

    signup = client.post(
        "/admin/tenants/signup-requests",
        json={
            "company_name": "DM Refrigeracion",
            "contact_name": "Diego",
            "email": "dm@test.com",
            "phone": "3515550101",
        },
    )

    approved = client.post(
        f"/admin/tenants/platform/signup-requests/{signup.json()['id']}/approve",
        headers=platform_headers,
        json={"admin_password": "temporal-123"},
    )

    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"
    assert approved.json()["created_tenant_id"] is not None
    assert approved.json()["created_admin_email"] == "dm@test.com"

    memberships = client.get("/admin/tenants/platform/memberships", headers=platform_headers)

    assert memberships.status_code == 200
    created_membership = next(
        item for item in memberships.json()["items"] if item["id"] == approved.json()["created_tenant_id"]
    )
    assert created_membership["membership_status"] == "active"
    assert created_membership["membership_due_date"] is not None

    service = client.post(
        "/cost-items",
        headers=platform_headers,
        json={
            "category": "services",
            "name": "Cobro Trimestral",
            "description": "Plan trimestral FacturEasy",
            "unit": "servicio",
            "unit_cost": "14250.00",
        },
    )

    assert service.status_code == 201

    paid = client.post(
        f"/admin/tenants/platform/memberships/{created_membership['id']}/paid",
        headers=platform_headers,
        json={"months_covered": 3, "amount": "90000.00", "notes": "Pago trimestral"},
    )

    assert paid.status_code == 200
    assert paid.json()["membership_status"] == "active"
    assert paid.json()["membership_last_payment_at"] is not None
    assert paid.json()["payments"][0]["months_covered"] == 3
    assert paid.json()["payments"][0]["amount"] == "90000.00"
    assert paid.json()["payments"][0]["quote_number"] is not None
    assert paid.json()["payments"][0]["notes"] == "Pago trimestral"

    clients = client.get("/clients", headers=platform_headers)
    assert clients.status_code == 200
    assert any(item["name"] == "DM Refrigeracion" for item in clients.json()["items"])

    quotes = client.get("/quotes", headers=platform_headers)
    assert quotes.status_code == 200
    generated_quote = next(
        item for item in quotes.json()["items"] if item["number"] == paid.json()["payments"][0]["quote_number"]
    )
    assert generated_quote["status"] == "issued"
    assert generated_quote["client_id"] is not None

    login_response = client.post(
        "/auth/login",
        json={"email": "dm@test.com", "password": "temporal-123"},
    )

    assert login_response.status_code == 200


def test_platform_admin_can_edit_and_cancel_membership_payments(api_context) -> None:
    client, SessionLocal = api_context
    platform_headers = create_tenant_and_login(
        client,
        name="FacturEasy",
        email="platform-payments@factureasy.test",
    )

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == "platform-payments@factureasy.test"))
        assert user is not None
        user.role = "platform_admin"
        db.commit()

    signup = client.post(
        "/admin/tenants/signup-requests",
        json={
            "company_name": "AUBASA",
            "contact_name": "Dario Lopez",
            "email": "dario@aubasa.test",
            "phone": "2245505050",
        },
    )
    assert signup.status_code == 201

    approved = client.post(
        f"/admin/tenants/platform/signup-requests/{signup.json()['id']}/approve",
        headers=platform_headers,
        json={"admin_password": "temporal-123"},
    )
    assert approved.status_code == 200

    for name, amount in (
        ("Cobro Mensual", "5000.00"),
        ("Cobro Trimestral", "14250.00"),
    ):
        response = client.post(
            "/cost-items",
            headers=platform_headers,
            json={
                "category": "services",
                "name": name,
                "description": f"{name} FacturEasy",
                "unit": "servicio",
                "unit_cost": amount,
            },
        )
        assert response.status_code == 201

    memberships = client.get("/admin/tenants/platform/memberships", headers=platform_headers)
    assert memberships.status_code == 200
    membership = next(
        item for item in memberships.json()["items"] if item["id"] == approved.json()["created_tenant_id"]
    )

    paid = client.post(
        f"/admin/tenants/platform/memberships/{membership['id']}/paid",
        headers=platform_headers,
        json={"months_covered": 3, "amount": "14250.00", "notes": "Pago trimestral"},
    )
    assert paid.status_code == 200
    payment = paid.json()["payments"][0]
    original_quote_number = payment["quote_number"]

    edited = client.patch(
        f"/admin/tenants/platform/memberships/{membership['id']}/payments/{payment['id']}",
        headers=platform_headers,
        json={
            "paid_at": date.today().isoformat(),
            "months_covered": 1,
            "amount": "5000.00",
            "notes": "Corregido a mensual",
        },
    )

    assert edited.status_code == 200
    edited_payment = next(item for item in edited.json()["payments"] if item["id"] == payment["id"])
    assert edited_payment["months_covered"] == 1
    assert edited_payment["amount"] == "5000.00"
    assert edited_payment["notes"] == "Corregido a mensual"
    assert edited_payment["status"] == "active"
    assert edited_payment["quote_number"] != original_quote_number

    cancelled = client.post(
        f"/admin/tenants/platform/memberships/{membership['id']}/payments/{payment['id']}/cancel",
        headers=platform_headers,
        json={"reason": "Carga duplicada"},
    )

    assert cancelled.status_code == 200
    cancelled_payment = next(item for item in cancelled.json()["payments"] if item["id"] == payment["id"])
    assert cancelled_payment["status"] == "cancelled"
    assert cancelled_payment["cancel_reason"] == "Carga duplicada"
    assert cancelled_payment["cancelled_at"] is not None
    assert cancelled.json()["membership_last_payment_at"] is None


def test_platform_admin_can_approve_fiscal_change_request(api_context) -> None:
    client, SessionLocal = api_context
    tenant_headers = create_tenant_and_login(
        client,
        name="DM Refrigeracion",
        email="admin@dm.test",
    )
    platform_headers = create_tenant_and_login(
        client,
        name="FacturEasy",
        email="platform@factureasy.test",
    )

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == "platform@factureasy.test"))
        assert user is not None
        user.role = "platform_admin"
        db.commit()

    change_request = client.post(
        "/admin/tenants/me/change-requests",
        headers=tenant_headers,
        json={"proposed_legal_name": "DM Refrigeracion SRL"},
    )

    assert change_request.status_code == 201

    approved = client.post(
        f"/admin/tenants/platform/change-requests/{change_request.json()['id']}/approve",
        headers=platform_headers,
        json={"review_notes": "Documentacion validada"},
    )

    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"

    profile = client.get("/admin/tenants/me", headers=tenant_headers)

    assert profile.json()["legal_name"] == "DM Refrigeracion SRL"
