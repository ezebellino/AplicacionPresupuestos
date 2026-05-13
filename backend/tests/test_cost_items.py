import pytest

from conftest import create_tenant_and_login


def valid_cost_item_payload(**overrides):
    payload = {
        "category": "equipment",
        "name": "Equipo base",
        "unit": "unit",
        "unit_cost": "100.00",
        "tax_rate": None,
    }
    payload.update(overrides)

    return payload


def test_cost_item_crud_uses_effective_tax_rate_and_logical_delete(api_context) -> None:
    client, _ = api_context
    headers = create_tenant_and_login(
        client,
        name="Acme Clima",
        email="admin@acme.test",
    )

    default_tax_response = client.post(
        "/cost-items",
        headers=headers,
        json={
            "category": "equipment",
            "name": "Andamio certificado",
            "description": "Alquiler diario",
            "unit": "day",
            "unit_cost": "12500.00",
            "tax_rate": None,
        },
    )
    override_tax_response = client.post(
        "/cost-items",
        headers=headers,
        json={
            "category": "materials",
            "name": "Caneria cobre",
            "unit": "meter",
            "unit_cost": "8500.00",
            "tax_rate": "10.50",
        },
    )

    assert default_tax_response.status_code == 201
    assert override_tax_response.status_code == 201
    default_tax_item = default_tax_response.json()
    override_tax_item = override_tax_response.json()
    assert default_tax_item["effective_tax_rate"] == "21.00"
    assert default_tax_item["tax_rate"] is None
    assert override_tax_item["effective_tax_rate"] == "10.50"
    assert "tenant_id" not in default_tax_item

    list_response = client.get("/cost-items", headers=headers)
    assert list_response.status_code == 200
    assert [item["name"] for item in list_response.json()["items"]] == [
        "Andamio certificado",
        "Caneria cobre",
    ]

    filtered_response = client.get(
        "/cost-items",
        headers=headers,
        params={"category": "equipment"},
    )
    assert filtered_response.status_code == 200
    assert [item["name"] for item in filtered_response.json()["items"]] == [
        "Andamio certificado"
    ]

    get_response = client.get(f"/cost-items/{default_tax_item['id']}", headers=headers)
    assert get_response.status_code == 200
    assert get_response.json()["effective_tax_rate"] == "21.00"

    update_response = client.patch(
        f"/cost-items/{default_tax_item['id']}",
        headers=headers,
        json={
            "name": "Andamio premium",
            "category": "services",
            "tax_rate": "27.00",
        },
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["name"] == "Andamio premium"
    assert updated["category"] == "services"
    assert updated["effective_tax_rate"] == "27.00"

    remove_override_response = client.patch(
        f"/cost-items/{default_tax_item['id']}",
        headers=headers,
        json={"tax_rate": None},
    )
    assert remove_override_response.status_code == 200
    assert remove_override_response.json()["effective_tax_rate"] == "21.00"

    delete_response = client.delete(
        f"/cost-items/{default_tax_item['id']}",
        headers=headers,
    )
    assert delete_response.status_code == 204
    assert delete_response.content == b""

    after_delete_list = client.get("/cost-items", headers=headers)
    assert [item["name"] for item in after_delete_list.json()["items"]] == [
        "Caneria cobre"
    ]
    assert (
        client.get(f"/cost-items/{default_tax_item['id']}", headers=headers).status_code
        == 404
    )
    assert (
        client.patch(
            f"/cost-items/{default_tax_item['id']}",
            headers=headers,
            json={"name": "Should not update"},
        ).status_code
        == 404
    )
    assert (
        client.delete(
            f"/cost-items/{default_tax_item['id']}",
            headers=headers,
        ).status_code
        == 404
    )


def test_cost_items_are_scoped_to_authenticated_tenant(api_context) -> None:
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

    tenant_a_response = client.post(
        "/cost-items",
        headers=tenant_a_headers,
        json={
            "category": "labor",
            "name": "Tecnico senior",
            "unit": "hour",
            "unit_cost": "15000.00",
        },
    )
    tenant_b_response = client.post(
        "/cost-items",
        headers=tenant_b_headers,
        json={
            "category": "equipment",
            "name": "Grua",
            "unit": "day",
            "unit_cost": "90000.00",
        },
    )
    assert tenant_a_response.status_code == 201
    assert tenant_b_response.status_code == 201

    response_a = client.get("/cost-items", headers=tenant_a_headers)
    response_b = client.get("/cost-items", headers=tenant_b_headers)
    assert [item["name"] for item in response_a.json()["items"]] == ["Tecnico senior"]
    assert [item["name"] for item in response_b.json()["items"]] == ["Grua"]

    tenant_b_item_id = tenant_b_response.json()["id"]
    assert (
        client.get(
            f"/cost-items/{tenant_b_item_id}",
            headers=tenant_a_headers,
        ).status_code
        == 404
    )
    assert (
        client.patch(
            f"/cost-items/{tenant_b_item_id}",
            headers=tenant_a_headers,
            json={"name": "Spoofed"},
        ).status_code
        == 404
    )
    assert (
        client.delete(
            f"/cost-items/{tenant_b_item_id}",
            headers=tenant_a_headers,
        ).status_code
        == 404
    )


def test_create_cost_item_ignores_payload_tenant_id(api_context) -> None:
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
        "/cost-items",
        headers=tenant_a_headers,
        json={
            "category": "services",
            "name": "Puesta en marcha",
            "unit": "job",
            "unit_cost": "50000.00",
            "tenant_id": tenant_b_me.json()["tenant_id"],
        },
    )

    assert create_response.status_code == 201
    assert "tenant_id" not in create_response.json()

    response_a = client.get("/cost-items", headers=tenant_a_headers)
    response_b = client.get("/cost-items", headers=tenant_b_headers)
    assert [item["name"] for item in response_a.json()["items"]] == [
        "Puesta en marcha"
    ]
    assert response_b.json()["items"] == []


def test_cost_item_endpoints_require_auth(api_context) -> None:
    client, _ = api_context
    item_id = "00000000-0000-0000-0000-000000000000"

    assert client.get("/cost-items").status_code == 401
    assert (
        client.post(
            "/cost-items",
            json={
                "category": "equipment",
                "name": "No Auth",
                "unit": "unit",
                "unit_cost": "1.00",
            },
        ).status_code
        == 401
    )
    assert client.get(f"/cost-items/{item_id}").status_code == 401
    assert (
        client.patch(f"/cost-items/{item_id}", json={"name": "No Auth"}).status_code
        == 401
    )
    assert client.delete(f"/cost-items/{item_id}").status_code == 401


def test_cost_item_category_must_be_allowed(api_context) -> None:
    client, _ = api_context
    headers = create_tenant_and_login(
        client,
        name="Acme Clima",
        email="admin@acme.test",
    )

    response = client.post(
        "/cost-items",
        headers=headers,
        json={
            "category": "travel",
            "name": "Viatico",
            "unit": "day",
            "unit_cost": "1000.00",
        },
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("unit_cost", "-0.01"),
        ("tax_rate", "-0.01"),
        ("tax_rate", "100.01"),
        ("unit_cost", "12.345"),
        ("unit_cost", "10000000000.00"),
    ],
)
def test_create_cost_item_rejects_invalid_money_fields(
    api_context,
    field,
    value,
) -> None:
    client, _ = api_context
    headers = create_tenant_and_login(
        client,
        name="Acme Clima",
        email="admin@acme.test",
    )

    response = client.post(
        "/cost-items",
        headers=headers,
        json=valid_cost_item_payload(**{field: value}),
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("unit_cost", "-0.01"),
        ("unit_cost", "10000000000.00"),
        ("tax_rate", "100.01"),
        ("tax_rate", "10.555"),
    ],
)
def test_update_cost_item_rejects_invalid_money_fields(
    api_context,
    field,
    value,
) -> None:
    client, _ = api_context
    headers = create_tenant_and_login(
        client,
        name="Acme Clima",
        email="admin@acme.test",
    )
    create_response = client.post(
        "/cost-items",
        headers=headers,
        json=valid_cost_item_payload(),
    )
    assert create_response.status_code == 201

    response = client.patch(
        f"/cost-items/{create_response.json()['id']}",
        headers=headers,
        json={field: value},
    )

    assert response.status_code == 422
