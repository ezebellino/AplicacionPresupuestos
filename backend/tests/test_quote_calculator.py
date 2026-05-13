from decimal import Decimal

from app.domain.quote_calculator import QuoteLineInput, calculate_quote


def test_calculates_quote_totals_with_item_tax_and_discount():
    result = calculate_quote(
        [
            QuoteLineInput(quantity=Decimal("2"), unit_price=Decimal("100.00"), tax_rate=Decimal("21.00"), discount_amount=Decimal("10.00")),
            QuoteLineInput(quantity=Decimal("1"), unit_price=Decimal("50.00"), tax_rate=Decimal("10.50"), discount_amount=Decimal("0.00")),
        ]
    )

    assert result.subtotal == Decimal("250.00")
    assert result.discount_total == Decimal("10.00")
    assert result.tax_total == Decimal("45.15")
    assert result.total == Decimal("285.15")


def test_rejects_negative_quantity():
    try:
        calculate_quote([QuoteLineInput(quantity=Decimal("-1"), unit_price=Decimal("100.00"), tax_rate=Decimal("21.00"))])
    except ValueError as exc:
        assert "quantity" in str(exc)
    else:
        raise AssertionError("expected ValueError")
