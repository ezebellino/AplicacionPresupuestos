from conftest import create_tenant_and_login


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
