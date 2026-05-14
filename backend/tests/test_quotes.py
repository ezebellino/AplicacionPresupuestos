from conftest import create_tenant_and_login


def create_client(client, headers, **overrides):
    payload = {
        "name": "Hospital Central",
        "document": "30-12345678-9",
        "email": "compras@hospital.test",
    }
    payload.update(overrides)

    response = client.post("/clients", headers=headers, json=payload)
    assert response.status_code == 201

    return response.json()


def create_cost_item(client, headers, **overrides):
    payload = {
        "category": "equipment",
        "name": "Bomba presurizadora",
        "description": "Equipo principal",
        "unit": "unit",
        "unit_cost": "100.00",
        "tax_rate": "10.50",
    }
    payload.update(overrides)

    response = client.post("/cost-items", headers=headers, json=payload)
    assert response.status_code == 201

    return response.json()


def create_quote(client, headers, client_id, **overrides):
    payload = {
        "client_id": client_id,
        "title": "Instalacion sala tecnica",
        "notes": "Cotizacion inicial",
    }
    payload.update(overrides)

    response = client.post("/quotes", headers=headers, json=payload)
    assert response.status_code == 201

    return response.json()


def add_quote_item(client, headers, quote_id, cost_item_id, **overrides):
    payload = {
        "source_cost_item_id": cost_item_id,
        "quantity": "2.00",
        "discount_amount": "5.00",
    }
    payload.update(overrides)

    response = client.post(f"/quotes/{quote_id}/items", headers=headers, json=payload)
    assert response.status_code == 201

    return response.json()


def test_create_draft_quote_and_add_historical_cost_item(api_context) -> None:
    client, _ = api_context
    headers = create_tenant_and_login(
        client,
        name="Acme Clima",
        email="admin@acme.test",
    )
    tenant_client = create_client(client, headers)
    cost_item = create_cost_item(client, headers)

    quote = create_quote(client, headers, tenant_client["id"])
    assert quote["status"] == "draft"
    assert quote["client_id"] == tenant_client["id"]
    assert quote["number"] == "Q-000001"
    assert quote["subtotal"] == "0.00"
    assert quote["tax_total"] == "0.00"
    assert quote["discount_total"] == "0.00"
    assert quote["total"] == "0.00"
    assert quote["items"] == []
    assert "tenant_id" not in quote

    item = add_quote_item(client, headers, quote["id"], cost_item["id"])
    assert item["source_cost_item_id"] == cost_item["id"]
    assert item["name"] == "Bomba presurizadora"
    assert item["description"] == "Equipo principal"
    assert item["category"] == "equipment"
    assert item["unit"] == "unit"
    assert item["unit_price"] == "100.00"
    assert item["tax_rate"] == "10.50"
    assert item["quantity"] == "2.00"
    assert item["discount_amount"] == "5.00"
    assert item["line_subtotal"] == "200.00"
    assert item["line_tax"] == "20.48"
    assert item["line_total"] == "215.48"

    fetched_quote = client.get(f"/quotes/{quote['id']}", headers=headers)
    assert fetched_quote.status_code == 200
    updated_quote = fetched_quote.json()
    assert updated_quote["subtotal"] == "200.00"
    assert updated_quote["discount_total"] == "5.00"
    assert updated_quote["tax_total"] == "20.48"
    assert updated_quote["total"] == "215.48"
    assert [quote_item["id"] for quote_item in updated_quote["items"]] == [item["id"]]

    cost_update = client.patch(
        f"/cost-items/{cost_item['id']}",
        headers=headers,
        json={
            "name": "Bomba modificada",
            "description": "Descripcion nueva",
            "category": "services",
            "unit": "day",
            "unit_cost": "999.00",
            "tax_rate": "27.00",
        },
    )
    assert cost_update.status_code == 200

    historical_quote = client.get(f"/quotes/{quote['id']}", headers=headers).json()
    historical_item = historical_quote["items"][0]
    assert historical_item["name"] == "Bomba presurizadora"
    assert historical_item["description"] == "Equipo principal"
    assert historical_item["category"] == "equipment"
    assert historical_item["unit"] == "unit"
    assert historical_item["unit_price"] == "100.00"
    assert historical_item["tax_rate"] == "10.50"


def test_quote_item_uses_cost_item_override_or_tenant_default_at_add_time(
    api_context,
) -> None:
    client, _ = api_context
    headers = create_tenant_and_login(
        client,
        name="Acme Clima",
        email="admin-default@acme.test",
    )
    tenant_client = create_client(client, headers)
    quote = create_quote(client, headers, tenant_client["id"])
    default_tax_cost_item = create_cost_item(
        client,
        headers,
        name="Servicio tecnico",
        tax_rate=None,
    )

    item = add_quote_item(
        client,
        headers,
        quote["id"],
        default_tax_cost_item["id"],
        quantity="1.00",
        discount_amount="0.00",
    )
    assert item["tax_rate"] == "21.00"

    client.patch(
        f"/cost-items/{default_tax_cost_item['id']}",
        headers=headers,
        json={"tax_rate": "10.50"},
    )
    stored_item = client.get(f"/quotes/{quote['id']}", headers=headers).json()["items"][0]
    assert stored_item["tax_rate"] == "21.00"


def test_quote_status_transitions(api_context) -> None:
    client, _ = api_context
    headers = create_tenant_and_login(
        client,
        name="Acme Clima",
        email="admin-transitions@acme.test",
    )
    tenant_client = create_client(client, headers)
    accepted_quote = create_quote(client, headers, tenant_client["id"])

    issued = client.post(f"/quotes/{accepted_quote['id']}/issue", headers=headers)
    assert issued.status_code == 200
    assert issued.json()["status"] == "issued"
    assert issued.json()["issued_at"] is not None

    accepted = client.post(f"/quotes/{accepted_quote['id']}/accept", headers=headers)
    assert accepted.status_code == 200
    assert accepted.json()["status"] == "accepted"
    assert (
        client.post(f"/quotes/{accepted_quote['id']}/reject", headers=headers).status_code
        == 409
    )

    rejected_quote = create_quote(client, headers, tenant_client["id"])
    assert (
        client.post(f"/quotes/{rejected_quote['id']}/accept", headers=headers).status_code
        == 409
    )
    issued_for_rejection = client.post(
        f"/quotes/{rejected_quote['id']}/issue",
        headers=headers,
    )
    assert issued_for_rejection.status_code == 200

    rejected = client.post(f"/quotes/{rejected_quote['id']}/reject", headers=headers)
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"
    assert (
        client.post(f"/quotes/{rejected_quote['id']}/issue", headers=headers).status_code
        == 409
    )


def test_only_draft_quote_items_are_mutable_and_inactive_cost_items_are_rejected(
    api_context,
) -> None:
    client, _ = api_context
    headers = create_tenant_and_login(
        client,
        name="Acme Clima",
        email="admin-mutations@acme.test",
    )
    tenant_client = create_client(client, headers)
    cost_item = create_cost_item(client, headers)
    quote = create_quote(client, headers, tenant_client["id"])
    item = add_quote_item(client, headers, quote["id"], cost_item["id"])

    patched_item = client.patch(
        f"/quotes/{quote['id']}/items/{item['id']}",
        headers=headers,
        json={"quantity": "3.00", "discount_amount": "0.00"},
    )
    assert patched_item.status_code == 200
    assert patched_item.json()["quantity"] == "3.00"
    assert patched_item.json()["line_subtotal"] == "300.00"

    issue_response = client.post(f"/quotes/{quote['id']}/issue", headers=headers)
    assert issue_response.status_code == 200

    assert (
        client.patch(
            f"/quotes/{quote['id']}/items/{item['id']}",
            headers=headers,
            json={"quantity": "4.00"},
        ).status_code
        == 409
    )
    assert (
        client.delete(f"/quotes/{quote['id']}/items/{item['id']}", headers=headers).status_code
        == 409
    )
    assert (
        client.post(
            f"/quotes/{quote['id']}/items",
            headers=headers,
            json={"source_cost_item_id": cost_item["id"], "quantity": "1.00"},
        ).status_code
        == 409
    )

    inactive_quote = create_quote(client, headers, tenant_client["id"])
    inactive_cost_item = create_cost_item(client, headers, name="Item inactivo")
    assert client.delete(f"/cost-items/{inactive_cost_item['id']}", headers=headers).status_code == 204
    assert (
        client.post(
            f"/quotes/{inactive_quote['id']}/items",
            headers=headers,
            json={
                "source_cost_item_id": inactive_cost_item["id"],
                "quantity": "1.00",
            },
        ).status_code
        == 404
    )


def test_quote_item_discount_cannot_exceed_line_subtotal(api_context) -> None:
    client, _ = api_context
    headers = create_tenant_and_login(
        client,
        name="Acme Clima",
        email="admin-discount@acme.test",
    )
    tenant_client = create_client(client, headers)
    cost_item = create_cost_item(client, headers, unit_cost="100.00")
    quote = create_quote(client, headers, tenant_client["id"])

    add_response = client.post(
        f"/quotes/{quote['id']}/items",
        headers=headers,
        json={
            "source_cost_item_id": cost_item["id"],
            "quantity": "1.00",
            "discount_amount": "100.01",
        },
    )
    assert add_response.status_code == 422

    item = add_quote_item(
        client,
        headers,
        quote["id"],
        cost_item["id"],
        quantity="1.00",
        discount_amount="0.00",
    )
    update_response = client.patch(
        f"/quotes/{quote['id']}/items/{item['id']}",
        headers=headers,
        json={"discount_amount": "100.01"},
    )
    assert update_response.status_code == 422


def test_quote_patch_rejects_explicit_null_client_id(api_context) -> None:
    client, _ = api_context
    headers = create_tenant_and_login(
        client,
        name="Acme Clima",
        email="admin-null-quote@acme.test",
    )
    tenant_client = create_client(client, headers)
    quote = create_quote(client, headers, tenant_client["id"])

    response = client.patch(
        f"/quotes/{quote['id']}",
        headers=headers,
        json={"client_id": None},
    )

    assert response.status_code == 422


def test_quote_item_patch_rejects_explicit_null_required_fields(api_context) -> None:
    client, _ = api_context
    headers = create_tenant_and_login(
        client,
        name="Acme Clima",
        email="admin-null-item@acme.test",
    )
    tenant_client = create_client(client, headers)
    cost_item = create_cost_item(client, headers)
    quote = create_quote(client, headers, tenant_client["id"])
    item = add_quote_item(client, headers, quote["id"], cost_item["id"])

    for field in [
        "category",
        "name",
        "unit",
        "quantity",
        "unit_price",
        "tax_rate",
        "discount_amount",
        "position",
    ]:
        response = client.patch(
            f"/quotes/{quote['id']}/items/{item['id']}",
            headers=headers,
            json={field: None},
        )
        assert response.status_code == 422


def test_deleting_quote_item_recalculates_quote_totals(api_context) -> None:
    client, _ = api_context
    headers = create_tenant_and_login(
        client,
        name="Acme Clima",
        email="admin-delete-recalc@acme.test",
    )
    tenant_client = create_client(client, headers)
    first_cost_item = create_cost_item(client, headers, name="Primer item")
    second_cost_item = create_cost_item(
        client,
        headers,
        name="Segundo item",
        unit_cost="50.00",
        tax_rate="21.00",
    )
    quote = create_quote(client, headers, tenant_client["id"])
    first_item = add_quote_item(
        client,
        headers,
        quote["id"],
        first_cost_item["id"],
        quantity="1.00",
        discount_amount="0.00",
    )
    second_item = add_quote_item(
        client,
        headers,
        quote["id"],
        second_cost_item["id"],
        quantity="2.00",
        discount_amount="0.00",
    )

    delete_first = client.delete(
        f"/quotes/{quote['id']}/items/{first_item['id']}",
        headers=headers,
    )
    assert delete_first.status_code == 204
    quote_with_remaining_item = client.get(f"/quotes/{quote['id']}", headers=headers).json()
    assert [item["id"] for item in quote_with_remaining_item["items"]] == [
        second_item["id"]
    ]
    assert quote_with_remaining_item["subtotal"] == "100.00"
    assert quote_with_remaining_item["discount_total"] == "0.00"
    assert quote_with_remaining_item["tax_total"] == "21.00"
    assert quote_with_remaining_item["total"] == "121.00"

    delete_second = client.delete(
        f"/quotes/{quote['id']}/items/{second_item['id']}",
        headers=headers,
    )
    assert delete_second.status_code == 204
    empty_quote = client.get(f"/quotes/{quote['id']}", headers=headers).json()
    assert empty_quote["items"] == []
    assert empty_quote["subtotal"] == "0.00"
    assert empty_quote["discount_total"] == "0.00"
    assert empty_quote["tax_total"] == "0.00"
    assert empty_quote["total"] == "0.00"


def test_quotes_are_scoped_to_authenticated_tenant(api_context) -> None:
    client, _ = api_context
    tenant_a_headers = create_tenant_and_login(
        client,
        name="Acme Clima",
        email="admin-a@acme.test",
    )
    tenant_b_headers = create_tenant_and_login(
        client,
        name="Beta Instalaciones",
        email="admin-b@beta.test",
    )
    tenant_a_client = create_client(client, tenant_a_headers, name="Cliente A")
    tenant_b_client = create_client(client, tenant_b_headers, name="Cliente B")
    tenant_a_cost_item = create_cost_item(client, tenant_a_headers, name="Item A")
    tenant_b_cost_item = create_cost_item(client, tenant_b_headers, name="Item B")
    tenant_b_quote = create_quote(client, tenant_b_headers, tenant_b_client["id"])
    tenant_b_item = add_quote_item(
        client,
        tenant_b_headers,
        tenant_b_quote["id"],
        tenant_b_cost_item["id"],
    )

    create_with_tenant_b_client = client.post(
        "/quotes",
        headers=tenant_a_headers,
        json={"client_id": tenant_b_client["id"], "title": "Spoofed"},
    )
    assert create_with_tenant_b_client.status_code == 404

    tenant_a_quote = create_quote(client, tenant_a_headers, tenant_a_client["id"])
    add_tenant_b_cost_item = client.post(
        f"/quotes/{tenant_a_quote['id']}/items",
        headers=tenant_a_headers,
        json={"source_cost_item_id": tenant_b_cost_item["id"], "quantity": "1.00"},
    )
    assert add_tenant_b_cost_item.status_code == 404

    assert client.get("/quotes", headers=tenant_a_headers).status_code == 200
    assert [
        quote["id"] for quote in client.get("/quotes", headers=tenant_a_headers).json()["items"]
    ] == [tenant_a_quote["id"]]
    assert client.get(f"/quotes/{tenant_b_quote['id']}", headers=tenant_a_headers).status_code == 404
    assert (
        client.patch(
            f"/quotes/{tenant_b_quote['id']}",
            headers=tenant_a_headers,
            json={"title": "Spoofed"},
        ).status_code
        == 404
    )
    assert (
        client.patch(
            f"/quotes/{tenant_b_quote['id']}/items/{tenant_b_item['id']}",
            headers=tenant_a_headers,
            json={"quantity": "3.00"},
        ).status_code
        == 404
    )
    assert (
        client.delete(
            f"/quotes/{tenant_b_quote['id']}/items/{tenant_b_item['id']}",
            headers=tenant_a_headers,
        ).status_code
        == 404
    )
    assert (
        client.post(
            f"/quotes/{tenant_b_quote['id']}/issue",
            headers=tenant_a_headers,
        ).status_code
        == 404
    )

    add_tenant_a_cost_item_to_tenant_b_quote = client.post(
        f"/quotes/{tenant_b_quote['id']}/items",
        headers=tenant_a_headers,
        json={"source_cost_item_id": tenant_a_cost_item["id"], "quantity": "1.00"},
    )
    assert add_tenant_a_cost_item_to_tenant_b_quote.status_code == 404
