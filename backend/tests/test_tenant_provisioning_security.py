import pytest
from sqlalchemy import func, select

from conftest import bootstrap_platform_headers, create_tenant_and_login

from app.core.security import create_access_token
from app.infra.models import Tenant, User


NEW_TENANT = {
    "name": "New customer",
    "admin_email": "new-customer@example.test",
    "admin_password": "new-customer-password",
}


def row_counts(SessionLocal):
    with SessionLocal() as db:
        return (
            db.scalar(select(func.count()).select_from(Tenant)),
            db.scalar(select(func.count()).select_from(User)),
        )


@pytest.mark.parametrize("path", ["/admin/tenants", "/admin/tenants/"])
def test_anonymous_direct_provisioning_is_rejected_without_writes(api_context, path):
    client, SessionLocal = api_context
    before = row_counts(SessionLocal)

    response = client.post(path, json=NEW_TENANT)

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert row_counts(SessionLocal) == before


@pytest.mark.parametrize("claim_platform_role", [False, True])
def test_tenant_admin_cannot_provision_even_with_platform_role_claim(
    api_context, claim_platform_role
):
    client, SessionLocal = api_context
    headers = create_tenant_and_login(
        client, name="Existing customer", email="existing@example.test"
    )
    if claim_platform_role:
        with SessionLocal() as db:
            user = db.scalar(select(User).where(User.email == "existing@example.test"))
            assert user is not None
            token = create_access_token(user.id, user.tenant_id, user.email, "platform_admin")
            headers = {"Authorization": f"Bearer {token}"}
    before = row_counts(SessionLocal)

    response = client.post("/admin/tenants", headers=headers, json=NEW_TENANT)

    assert response.status_code == 403
    assert row_counts(SessionLocal) == before


def test_platform_admin_can_provision_and_customer_can_login(api_context):
    client, SessionLocal = api_context
    headers = bootstrap_platform_headers(client)
    before = row_counts(SessionLocal)

    response = client.post("/admin/tenants", headers=headers, json=NEW_TENANT)

    assert response.status_code == 201
    assert response.json()["tenant"]["name"] == NEW_TENANT["name"]
    assert response.json()["admin"]["role"] == "admin"
    assert row_counts(SessionLocal) == (before[0] + 1, before[1] + 1)
    login = client.post(
        "/auth/login",
        json={"email": NEW_TENANT["admin_email"], "password": NEW_TENANT["admin_password"]},
    )
    assert login.status_code == 200


def test_public_signup_remains_pending_without_provisioning(api_context):
    client, SessionLocal = api_context
    before = row_counts(SessionLocal)

    response = client.post(
        "/admin/tenants/signup-requests",
        json={
            "company_name": "New customer",
            "contact_name": "Customer contact",
            "email": "signup@example.test",
            "phone": "3515550101",
        },
    )

    assert response.status_code == 201
    assert response.json()["status"] == "pending"
    assert response.json()["created_tenant_id"] is None
    assert row_counts(SessionLocal) == before
