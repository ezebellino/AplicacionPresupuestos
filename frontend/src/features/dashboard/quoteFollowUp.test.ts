import { describe, expect, it } from 'vitest';
import type { Quote } from '../../shared/api/client';
import { daysSinceIssued, followUpDueAt, followUpPhone, pendingFollowUps, quoteTimestampUtc } from './quoteFollowUp';

export const followUpFixture: Quote = {
  id: 'q1', client_id: 'c1', number: 'Q-000001', status: 'issued', title: 'Servicio', notes: null,
  valid_until: null, created_at: '2026-11-01T12:00:00Z', issued_at: '2026-11-02T12:00:00Z',
  subtotal: '100', discount_total: '0', tax_total: '0', total: '100', items: [],
};

describe('quote follow-up scheduling', () => {
  it('starts precisely 72 hours after issue and includes all older quotes', () => {
    const due = Date.parse('2026-11-05T12:00:00Z');
    expect(pendingFollowUps([followUpFixture], due - 1)).toEqual([]);
    expect(pendingFollowUps([followUpFixture], due)).toEqual([followUpFixture]);
    expect(pendingFollowUps(Array.from({ length: 8 }, (_, i) => ({ ...followUpFixture, id: String(i) })), due)).toHaveLength(8);
  });
  it('excludes resolved quotes and honors postponed reminders', () => {
    const now = Date.parse('2026-11-10T12:00:00Z');
    expect(pendingFollowUps([
      { ...followUpFixture, status: 'accepted' }, { ...followUpFixture, status: 'rejected' },
      { ...followUpFixture, status: 'draft' }, { ...followUpFixture, follow_up_at: '2026-11-11T00:00:00Z' },
    ], now)).toEqual([]);
  });
  it('handles UTC without zone, offsets and legacy missing issuance', () => {
    expect(quoteTimestampUtc('2026-11-02T12:00:00')).toBe(quoteTimestampUtc('2026-11-02T09:00:00-03:00'));
    expect(followUpDueAt({ ...followUpFixture, issued_at: null })).toBe(Date.parse('2026-11-04T12:00:00Z'));
    expect(daysSinceIssued({ ...followUpFixture, issued_at: null }, Date.now())).toBeNull();
  });
  it('requires an explicit international destination', () => {
    expect(followUpPhone('+54 (9) 11-5555-1234')).toBe('5491155551234');
    expect(followUpPhone('005491155551234')).toBe('5491155551234');
    for (const invalid of ['', '1155551234', '+1', '+54<script>', null]) expect(followUpPhone(invalid)).toBeNull();
  });
});
