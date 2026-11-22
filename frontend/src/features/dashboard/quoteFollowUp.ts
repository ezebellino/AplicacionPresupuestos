import type { Quote } from '../../shared/api/client';

const DAY = 24 * 60 * 60 * 1000;

// The API's SQLite timestamps can omit the zone; persisted timestamps are UTC.
export function quoteTimestampUtc(value: string): number {
  return Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`);
}

export function followUpDueAt(quote: Quote): number {
  if (quote.follow_up_at) return quoteTimestampUtc(quote.follow_up_at);
  return quoteTimestampUtc(quote.issued_at ?? quote.created_at) + 3 * DAY;
}

export function pendingFollowUps(quotes: Quote[], now: number): Quote[] {
  return quotes.filter((quote) => quote.status === 'issued' && followUpDueAt(quote) <= now)
    .sort((left, right) => followUpDueAt(left) - followUpDueAt(right) || left.id.localeCompare(right.id));
}

export function daysSinceIssued(quote: Quote, now: number): number | null {
  if (!quote.issued_at) return null;
  const issuedAt = quoteTimestampUtc(quote.issued_at);
  return Number.isFinite(issuedAt) ? Math.max(0, Math.floor((now - issuedAt) / DAY)) : null;
}

export function buildFollowUpMessage(clientName: string, quote: Quote): string {
  return `Hola, ${clientName}. ¿Pudiste revisar el presupuesto ${quote.number}? Si necesitás aclarar algo, estoy a disposición.`;
}

export function followUpPhone(phone: string | null | undefined): string | null {
  const value = (phone ?? '').trim();
  if (!/^(\+|00)[\d\s().-]+$/.test(value)) return null;
  const digits = value.replace(/^00/, '').replace(/\D/g, '');
  // Do not guess a country code or open a message addressed to nobody.
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}
