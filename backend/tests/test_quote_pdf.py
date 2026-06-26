from io import BytesIO

from pypdf import PdfReader
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm

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


def extract_pdf_text(content: bytes) -> str:
    reader = PdfReader(BytesIO(content))

    return "\n".join(page.extract_text() or "" for page in reader.pages)


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


def test_issued_quote_pdf_contains_human_readable_quote_content(api_context) -> None:
    client, _ = api_context
    headers = create_tenant_and_login(
        client,
        name="Acme Clima",
        email="admin-pdf-content@acme.test",
    )
    quote = create_issued_quote_with_item(client, headers)

    response = client.get(f"/quotes/{quote['id']}/pdf", headers=headers)

    assert response.status_code == 200
    text = extract_pdf_text(response.content)
    assert "Presupuesto" in text
    assert "Factura electronica" not in text
    assert "Acme Clima" in text
    assert quote["number"] in text
    assert "Hospital Central" in text
    assert "Bomba presurizadora" in text
    assert "Equipo principal" in text
    assert "Subtotal" in text
    assert "IVA" in text
    assert "Total" in text
    assert "200.00" in text
    assert "20.48" in text
    assert "215.48" in text


def test_quote_pdf_escapes_special_chars_without_losing_readable_text(
    api_context,
) -> None:
    client, _ = api_context
    headers = create_tenant_and_login(
        client,
        name="A&B <script>",
        email="admin-pdf-special@acme.test",
    )
    tenant_client = create_client(
        client,
        headers,
        name="Hospital A&B <script>",
    )
    cost_item = create_cost_item(
        client,
        headers,
        name="Bomba A&B <script>",
        description="Equipo A&B <script>",
    )
    quote = create_quote(client, headers, tenant_client["id"])
    add_quote_item(client, headers, quote["id"], cost_item["id"])
    issue_response = client.post(f"/quotes/{quote['id']}/issue", headers=headers)
    assert issue_response.status_code == 200

    response = client.get(f"/quotes/{quote['id']}/pdf", headers=headers)

    assert response.status_code == 200
    text = extract_pdf_text(response.content)
    assert "A&B" in text
    assert "script" in text


def test_quote_pdf_item_table_fits_inside_document_frame(api_context, monkeypatch) -> None:
    from app.infra import pdf

    client, _ = api_context
    headers = create_tenant_and_login(
        client,
        name="Acme Clima",
        email="admin-pdf-width@acme.test",
    )
    quote = create_issued_quote_with_item(client, headers)
    captured_widths = []
    original_table = pdf.Table

    def spy_table(*args, **kwargs):
        if "colWidths" in kwargs:
            captured_widths.append(kwargs["colWidths"])
        return original_table(*args, **kwargs)

    monkeypatch.setattr(pdf, "Table", spy_table)

    response = client.get(f"/quotes/{quote['id']}/pdf", headers=headers)

    assert response.status_code == 200
    item_table_widths = captured_widths[0]
    document_frame_width = A4[0] - (36 * mm)
    assert sum(item_table_widths) <= document_frame_width


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
