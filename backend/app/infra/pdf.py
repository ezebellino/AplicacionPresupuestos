from collections.abc import Sequence
from datetime import datetime
from decimal import Decimal
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.infra.models import Client, Quote, QuoteItem, Tenant


def build_quote_pdf(
    tenant: Tenant,
    client: Client,
    quote: Quote,
    items: Sequence[QuoteItem],
) -> bytes:
    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )
    styles = getSampleStyleSheet()
    normal = styles["Normal"]
    title = styles["Title"]
    heading = styles["Heading2"]

    story = [
        Paragraph("Presupuesto", title),
        Paragraph(_clean_text(tenant.legal_name or tenant.name), heading),
        Paragraph(_tenant_details(tenant), normal),
        Spacer(1, 8 * mm),
        Paragraph(f"Numero: {_clean_text(quote.number)}", normal),
        Paragraph(f"Fecha: {_format_date(quote.issued_at or quote.created_at)}", normal),
        Paragraph(f"Cliente: {_clean_text(client.name)}", normal),
        Paragraph(_client_details(client), normal),
        Spacer(1, 8 * mm),
    ]

    table_data = [
        [
            Paragraph("Item", normal),
            Paragraph("Cantidad", normal),
            Paragraph("Precio unit.", normal),
            Paragraph("Desc.", normal),
            Paragraph("IVA", normal),
            Paragraph("Total", normal),
        ]
    ]
    for item in sorted(items, key=lambda quote_item: (quote_item.position, quote_item.id)):
        item_name = _clean_text(item.name)
        if item.description:
            item_name = f"{item_name}<br/>{_clean_text(item.description)}"
        table_data.append(
            [
                Paragraph(item_name, normal),
                _money(item.quantity),
                _money(item.unit_price),
                _money(item.discount_amount),
                _money(item.line_tax),
                _money(item.line_total),
            ]
        )

    item_table_widths = _item_table_widths(document.width)
    table = Table(
        table_data,
        colWidths=item_table_widths,
        repeatRows=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EDEFF2")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1F2937")),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD5E1")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.extend([table, Spacer(1, 8 * mm)])

    totals_table = Table(
        [
            ["Subtotal", _money(quote.subtotal)],
            ["Descuento", _money(quote.discount_total)],
            ["IVA", _money(quote.tax_total)],
            ["Total", _money(quote.total)],
        ],
        colWidths=[35 * mm, 35 * mm],
        hAlign="RIGHT",
    )
    totals_table.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("LINEABOVE", (0, -1), (-1, -1), 0.5, colors.HexColor("#1F2937")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(totals_table)

    document.build(story)
    return buffer.getvalue()


def _tenant_details(tenant: Tenant) -> str:
    details = []
    if tenant.tax_id:
        details.append(f"CUIT: {_clean_text(tenant.tax_id)}")
    return "<br/>".join(details)


def _client_details(client: Client) -> str:
    details = []
    if client.document:
        details.append(f"Documento: {_clean_text(client.document)}")
    if client.email:
        details.append(f"Email: {_clean_text(client.email)}")
    if client.phone:
        details.append(f"Telefono: {_clean_text(client.phone)}")
    if client.address:
        details.append(f"Direccion: {_clean_text(client.address)}")
    return "<br/>".join(details)


def _format_date(value: datetime) -> str:
    return value.date().isoformat()


def _money(value: Decimal) -> str:
    return f"{value:.2f}"


def _item_table_widths(frame_width: float) -> list[float]:
    return [
        frame_width * 0.32,
        frame_width * 0.13,
        frame_width * 0.15,
        frame_width * 0.12,
        frame_width * 0.12,
        frame_width * 0.16,
    ]


def _clean_text(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\n", "<br/>")
    )
