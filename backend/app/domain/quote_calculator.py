from dataclasses import dataclass
from decimal import Decimal

from app.domain.money import quantize_money


ZERO = Decimal("0.00")


@dataclass(frozen=True)
class QuoteLineInput:
    quantity: Decimal
    unit_price: Decimal
    tax_rate: Decimal
    discount_amount: Decimal = ZERO


@dataclass(frozen=True)
class QuoteLineResult:
    subtotal: Decimal
    discount_amount: Decimal
    tax_total: Decimal
    total: Decimal


@dataclass(frozen=True)
class QuoteTotals:
    subtotal: Decimal
    discount_total: Decimal
    tax_total: Decimal
    total: Decimal
    lines: list[QuoteLineResult]


def calculate_quote(lines: list[QuoteLineInput]) -> QuoteTotals:
    line_results: list[QuoteLineResult] = []

    subtotal = ZERO
    discount_total = ZERO
    tax_total = ZERO
    total = ZERO

    for line in lines:
        _validate_line(line)

        line_subtotal = quantize_money(line.quantity * line.unit_price)
        if line.discount_amount > line_subtotal:
            raise ValueError("discount_amount cannot exceed line subtotal")

        taxable_amount = quantize_money(line_subtotal - line.discount_amount)
        line_tax = quantize_money(taxable_amount * line.tax_rate / Decimal("100"))
        line_total = quantize_money(taxable_amount + line_tax)

        line_results.append(
            QuoteLineResult(
                subtotal=line_subtotal,
                discount_amount=quantize_money(line.discount_amount),
                tax_total=line_tax,
                total=line_total,
            )
        )

        subtotal = quantize_money(subtotal + line_subtotal)
        discount_total = quantize_money(discount_total + line.discount_amount)
        tax_total = quantize_money(tax_total + line_tax)
        total = quantize_money(total + line_total)

    return QuoteTotals(
        subtotal=subtotal,
        discount_total=discount_total,
        tax_total=tax_total,
        total=total,
        lines=line_results,
    )


def _validate_line(line: QuoteLineInput) -> None:
    if line.quantity <= 0:
        raise ValueError("quantity must be greater than zero")
    if line.unit_price < 0:
        raise ValueError("unit_price cannot be negative")
    if line.tax_rate < 0:
        raise ValueError("tax_rate cannot be negative")
    if line.discount_amount < 0:
        raise ValueError("discount_amount cannot be negative")
