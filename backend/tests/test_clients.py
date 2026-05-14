from conftest import create_tenant_and_login


def test_client_crud_is_scoped_to_authenticated_tenant(api_context) -> None:
    client, _ = api_context
    tenant_headers = create_tenant_and_login(
        client,
        name="Acme Clima",
        email="admin@acme.test",
    )

    create_response = client.post(
        "/clients",
        headers=tenant_headers,
        json={
            "name": "Hospital Central",
            "document": "30-12345678-9",
            "email": "compras@hospital.test",
            "phone": "+54 11 5555-0101",
            "address": "Av. Siempre Viva 742",
            "notes": "Prefers monthly maintenance quotes",
        },
    )

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["id"]
    assert created["name"] == "Hospital Central"
    assert "tenant_id" not in created

    list_response = client.get("/clients", headers=tenant_headers)
    assert list_response.status_code == 200
    assert [item["name"] for item in list_response.json()["items"]] == [
        "Hospital Central"
    ]

    get_response = client.get(f"/clients/{created['id']}", headers=tenant_headers)
    assert get_response.status_code == 200
    assert get_response.json()["email"] == "compras@hospital.test"

    update_response = client.patch(
        f"/clients/{created['id']}",
        headers=tenant_headers,
        json={"name": "Hospital Central Renovado", "notes": None},
    )
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Hospital Central Renovado"
    assert update_response.json()["notes"] is None

    delete_response = client.delete(f"/clients/{created['id']}", headers=tenant_headers)
    assert delete_response.status_code == 204
    assert delete_response.content == b""

    missing_response = client.get(f"/clients/{created['id']}", headers=tenant_headers)
    assert missing_response.status_code == 404


def test_client_endpoints_require_auth(api_context) -> None:
    client, _ = api_context

    assert client.get("/clients").status_code == 401
    assert client.post("/clients", json={"name": "No Auth"}).status_code == 401
    assert client.get("/clients/00000000-0000-0000-0000-000000000000").status_code == 401
    assert (
        client.patch(
            "/clients/00000000-0000-0000-0000-000000000000",
            json={"name": "No Auth"},
        ).status_code
        == 401
    )


def test_client_service_history_is_scoped_to_authenticated_tenant(api_context) -> None:
    client, _ = api_context
    tenant_headers = create_tenant_and_login(
        client,
        name="Acme Clima",
        email="admin@acme.test",
    )
    other_headers = create_tenant_and_login(
        client,
        name="Other Tenant",
        email="admin@other.test",
    )
    create_client_response = client.post(
        "/clients",
        headers=tenant_headers,
        json={"name": "Hospital Central"},
    )
    client_id = create_client_response.json()["id"]

    create_service_response = client.post(
        f"/clients/{client_id}/service-records",
        headers=tenant_headers,
        json={
            "performed_at": "2026-05-14T10:30:00",
            "title": "Mantenimiento preventivo",
            "description": "Limpieza de filtros y control de presion.",
            "amount": "125000.00",
        },
    )

    assert create_service_response.status_code == 201
    created_service = create_service_response.json()
    assert created_service["id"]
    assert created_service["client_id"] == client_id
    assert created_service["title"] == "Mantenimiento preventivo"
    assert created_service["amount"] == "125000.00"
    assert "tenant_id" not in created_service

    list_response = client.get(
        f"/clients/{client_id}/service-records",
        headers=tenant_headers,
    )

    assert list_response.status_code == 200
    assert [item["title"] for item in list_response.json()["items"]] == [
        "Mantenimiento preventivo"
    ]

    cross_tenant_list = client.get(
        f"/clients/{client_id}/service-records",
        headers=other_headers,
    )
    cross_tenant_create = client.post(
        f"/clients/{client_id}/service-records",
        headers=other_headers,
        json={
            "performed_at": "2026-05-14T10:30:00",
            "title": "No permitido",
        },
    )

    assert cross_tenant_list.status_code == 404
    assert cross_tenant_create.status_code == 404
    assert (
        client.delete("/clients/00000000-0000-0000-0000-000000000000").status_code
        == 401
    )
