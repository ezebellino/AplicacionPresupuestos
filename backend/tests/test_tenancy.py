from conftest import create_tenant_and_login


def test_tenants_can_only_list_and_fetch_their_own_clients(api_context) -> None:
    client, _ = api_context
    tenant_a_headers = create_tenant_and_login(
        client,
        name="Acme Clima",
        email="admin@acme.test",
    )
    tenant_b_headers = create_tenant_and_login(
        client,
        name="Beta Instalaciones",
        email="admin@beta.test",
    )

    client_a_response = client.post(
        "/clients",
        headers=tenant_a_headers,
        json={"name": "Cliente A"},
    )
    client_b_response = client.post(
        "/clients",
        headers=tenant_b_headers,
        json={"name": "Cliente B"},
    )
    assert client_a_response.status_code == 201
    assert client_b_response.status_code == 201

    response_a = client.get("/clients", headers=tenant_a_headers)
    response_b = client.get("/clients", headers=tenant_b_headers)

    assert response_a.status_code == 200
    assert response_b.status_code == 200
    assert [item["name"] for item in response_a.json()["items"]] == ["Cliente A"]
    assert [item["name"] for item in response_b.json()["items"]] == ["Cliente B"]

    cross_tenant_response = client.get(
        f"/clients/{client_b_response.json()['id']}",
        headers=tenant_a_headers,
    )
    assert cross_tenant_response.status_code == 404


def test_create_client_ignores_payload_tenant_id(api_context) -> None:
    client, _ = api_context
    tenant_a_headers = create_tenant_and_login(
        client,
        name="Acme Clima",
        email="admin@acme.test",
    )
    tenant_b_headers = create_tenant_and_login(
        client,
        name="Beta Instalaciones",
        email="admin@beta.test",
    )
    tenant_b_me = client.get("/auth/me", headers=tenant_b_headers)
    assert tenant_b_me.status_code == 200

    create_response = client.post(
        "/clients",
        headers=tenant_a_headers,
        json={
            "name": "Spoofed Tenant Client",
            "tenant_id": tenant_b_me.json()["tenant_id"],
        },
    )

    assert create_response.status_code == 201
    assert "tenant_id" not in create_response.json()

    response_a = client.get("/clients", headers=tenant_a_headers)
    response_b = client.get("/clients", headers=tenant_b_headers)
    assert [item["name"] for item in response_a.json()["items"]] == [
        "Spoofed Tenant Client"
    ]
    assert response_b.json()["items"] == []
