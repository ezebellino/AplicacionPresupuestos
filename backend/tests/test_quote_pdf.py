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


def create_issued_quote_with_item(client, headers):
    tenant_client = create_client(client, headers)
    cost_item = create_cost_item(client, headers)
    quote = create_quote(client, headers, tenant_client["id"])
    add_quote_item(client, headers, quote["id"], cost_item["id"])

    issue_response = client.post(f"/quotes/{quote['id']}/issue", headers=headers)
    assert issue_response.status_code == 200

    return issue_response.json()


def test_issued_quote_pdf_returns_pdf_bytes(api_context) -> None:
    client, _ = api_context
    headers = create_tenant_and_login(
        client,
        name="Acme Clima",
        email="admin-pdf@acme.test",
    )
    quote = create_issued_quote_with_item(client, headers)

    response = client.get(f"/quotes/{quote['id']}/pdf", headers=headers)

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-disposition"] == (
        f'attachment; filename="presupuesto-{quote["number"]}.pdf"'
    )
    assert response.content.startswith(b"%PDF")


def test_quote_pdf_requires_authentication(api_context) -> None:
    client, _ = api_context
    headers = create_tenant_and_login(
        client,
        name="Acme Clima",
        email="admin-pdf-auth@acme.test",
    )
    quote = create_issued_quote_with_item(client, headers)

    response = client.get(f"/quotes/{quote['id']}/pdf")

    assert response.status_code == 401


def test_quote_pdf_is_scoped_to_authenticated_tenant(api_context) -> None:
    client, _ = api_context
    tenant_a_headers = create_tenant_and_login(
        client,
        name="Acme Clima",
        email="admin-pdf-a@acme.test",
    )
    tenant_b_headers = create_tenant_and_login(
        client,
        name="Beta Instalaciones",
        email="admin-pdf-b@beta.test",
    )
    tenant_b_quote = create_issued_quote_with_item(client, tenant_b_headers)

    response = client.get(f"/quotes/{tenant_b_quote['id']}/pdf", headers=tenant_a_headers)

    assert response.status_code == 404
