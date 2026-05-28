import type { Client, ExpenseEntry, ExpenseStatus, Quote, QuoteStatus } from '../../shared/api/client';

export function matchesSearch(values: Array<string | null>, search: string): boolean {
  const term = search.trim().toLowerCase();

  if (!term) {
    return true;
  }

  return values.some((value) => value?.toLowerCase().includes(term));
}

export function clientName(clients: Client[], clientId: string): string {
  return clients.find((client) => client.id === clientId)?.name ?? 'Cliente';
}

export function formatMonth(value: string): string {
  const [year, month] = value.split('-').map(Number);

  return new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));
}

export function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function formatMoney(value: number | string): string {
  return new Intl.NumberFormat('es-AR', {
    currency: 'ARS',
    style: 'currency',
  }).format(Number(value));
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function openWhatsAppMessage(phone: string, message: string): void {
  const target = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  window.open(target, '_blank', 'noopener,noreferrer');
}

export function openMailTo(email: string, subject: string, body: string): void {
  const target = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = target;
}

export function formatMonthsCovered(value: number): string {
  if (value === 1) {
    return 'Mensual';
  }

  if (value === 3) {
    return 'Trimestral';
  }

  if (value === 6) {
    return 'Semestral';
  }

  if (value === 12) {
    return 'Anual';
  }

  return `${value} meses`;
}

export function quoteTimestamp(quote: Quote): number {
  return new Date(quote.issued_at ?? quote.created_at).getTime();
}

export function sumQuotes(quotes: Quote[], status?: QuoteStatus): number {
  return quotes.reduce((total, quote) => {
    if (status && quote.status !== status) {
      return total;
    }

    return total + Number(quote.total);
  }, 0);
}

export function sumExpenses(expenses: ExpenseEntry[], status?: ExpenseStatus): number {
  return expenses.reduce((total, expense) => {
    if (status && expense.status !== status) {
      return total;
    }

    return total + Number(expense.amount);
  }, 0);
}

export function buildSmartTreasury(acceptedQuotes: Quote[], allQuotes: Quote[], expenses: ExpenseEntry[]) {
  const monthlyTotals = acceptedQuotes.reduce<Record<string, number>>((totals, quote) => {
    const date = new Date(quote.issued_at ?? quote.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    totals[key] = (totals[key] ?? 0) + Number(quote.total);
    return totals;
  }, {});
  const months = Object.entries(monthlyTotals)
    .map(([label, value]) => ({ label: formatMonth(label), value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);
  const monthlyCounts = acceptedQuotes.reduce<Record<string, number>>((totals, quote) => {
    const date = new Date(quote.issued_at ?? quote.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    totals[key] = (totals[key] ?? 0) + 1;
    return totals;
  }, {});
  const acceptedByMonth = Object.entries(monthlyCounts)
    .map(([label, value]) => ({ label: formatMonth(label), value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);
  const totalAccepted = sumQuotes(acceptedQuotes);
  const averageTicket = acceptedQuotes.length ? totalAccepted / acceptedQuotes.length : 0;
  const conversionRate = allQuotes.length ? (acceptedQuotes.length / allQuotes.length) * 100 : 0;
  const topMonth = months[0];
  const pendingValue = sumQuotes(allQuotes, 'issued');
  const totalExpenses = sumExpenses(expenses);
  const pendingExpenses = sumExpenses(expenses, 'pending');
  const netBalance = totalAccepted - totalExpenses;
  const acceptedCount = acceptedQuotes.length;

  return {
    acceptedByMonth,
    cards: [
      { label: 'Presupuestos aceptados', value: String(acceptedCount) },
      { label: 'Facturacion aceptada', value: formatMoney(totalAccepted) },
      { label: 'Ticket promedio', value: formatMoney(averageTicket) },
      { label: 'Conversion', value: `${conversionRate.toFixed(0)}%` },
      { label: 'Gastos registrados', value: formatMoney(totalExpenses) },
      { label: 'Balance neto', value: formatMoney(netBalance) },
    ],
    insights: [
      {
        title: 'Ritmo de cierre',
        text: acceptedCount
          ? `Hay ${acceptedCount} presupuestos aceptados registrados. La lectura mas util es sostener ese ritmo de cierre y convertir mas emitidos en aceptados.`
          : 'Cuando empiecen a cerrarse presupuestos aceptados, aca vas a ver el ritmo real de conversion del negocio.',
      },
      {
        title: 'Mes mas fuerte',
        text: topMonth
          ? `${topMonth.label} concentra la mayor facturacion aceptada con ${formatMoney(topMonth.value)}. Puede servir para planificar stock, agenda y disponibilidad.`
          : 'Todavia no hay meses con facturacion aceptada suficiente para detectar tendencia.',
      },
      {
        title: 'Caja pendiente',
        text: pendingValue > 0
          ? `Hay ${formatMoney(pendingValue)} en presupuestos emitidos pendientes de aceptacion. Es el primer lugar donde conviene hacer seguimiento.`
          : 'No hay monto emitido pendiente. La tesoreria actual no muestra caja inmediata por cerrar.',
      },
      {
        title: 'Presion de gastos',
        text: totalExpenses > 0
          ? `Se registran ${formatMoney(totalExpenses)} en gastos totales, con ${formatMoney(pendingExpenses)} todavia pendientes. Esto conviene leerlo junto con la facturacion aceptada para medir margen real.`
          : 'Todavia no hay gastos cargados. Cuando se empiecen a registrar, aca vas a ver el peso real de caja e inversion.',
      },
    ],
    months,
  };
}
