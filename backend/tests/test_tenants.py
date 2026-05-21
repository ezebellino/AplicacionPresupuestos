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

    login_response = client.post(
        "/auth/login",
        json={"email": "dm@test.com", "password": "temporal-123"},
    )

    assert login_response.status_code == 200


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
