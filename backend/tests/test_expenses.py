from conftest import create_tenant_and_login


def test_create_and_update_tenant_expense(api_context) -> None:
    client, _ = api_context
    headers = create_tenant_and_login(
        client,
        name="DM Refrigeracion",
        email="admin-expenses@dm.test",
    )

    category_response = client.post(
        "/expenses/categories",
        headers=headers,
        json={"name": "Materiales"},
    )
    assert category_response.status_code == 201
    category = category_response.json()

    entry_response = client.post(
        "/expenses",
        headers=headers,
        json={
            "amount": "85000.00",
            "detail": "Compra de caños para stock",
            "notes": "Se guarda para futuras instalaciones.",
            "status": "pending",
            "category_id": category["id"],
        },
    )
    assert entry_response.status_code == 201
    entry = entry_response.json()
    assert entry["category_name"] == "Materiales"
    assert entry["client_id"] is None
    assert entry["status"] == "pending"

    list_response = client.get("/expenses", headers=headers)
    assert list_response.status_code == 200
    items = list_response.json()["items"]
    assert len(items) == 1
    assert items[0]["detail"] == "Compra de caños para stock"

    update_response = client.patch(
        f"/expenses/{entry['id']}",
        headers=headers,
        json={"status": "paid"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["status"] == "paid"


def test_expense_is_tenant_scoped(api_context) -> None:
    client, _ = api_context
    first_headers = create_tenant_and_login(
        client,
        name="Tenant Uno",
        email="uno-expenses@test.com",
    )
    second_headers = create_tenant_and_login(
        client,
        name="Tenant Dos",
        email="dos-expenses@test.com",
    )

    create_response = client.post(
        "/expenses",
        headers=first_headers,
        json={
            "amount": "12000.00",
            "detail": "Traslado de materiales",
            "status": "pending",
        },
    )
    assert create_response.status_code == 201
    expense_id = create_response.json()["id"]

    other_list = client.get("/expenses", headers=second_headers)
    assert other_list.status_code == 200
    assert other_list.json()["items"] == []

    forbidden_update = client.patch(
        f"/expenses/{expense_id}",
        headers=second_headers,
        json={"status": "paid"},
    )
    assert forbidden_update.status_code == 404
