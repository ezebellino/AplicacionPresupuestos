import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Swal from 'sweetalert2';
import { apiClient, type Quote } from '../../shared/api/client';
import { QuoteFollowUpPanel } from './QuoteFollowUpPanel';

const quote: Quote = { id: 'q1', client_id: 'c1', number: 'Q-000001', status: 'issued', title: 'Servicio', notes: null,
  valid_until: null, created_at: '2026-11-01T12:00:00Z', issued_at: '2026-11-02T12:00:00Z',
  subtotal: '100', discount_total: '0', tax_total: '0', total: '100', items: [] };
const now = Date.parse('2026-11-10T12:00:00Z');
const mount = (quotes = [quote]) => {
  const onQuoteUpdated = vi.fn();
  render(<QuoteFollowUpPanel clients={[]} quotes={quotes} now={now} isSaving={false}
    onSavingChange={vi.fn()} onQuoteUpdated={onQuoteUpdated} onOpenQuote={vi.fn()} />);
  return onQuoteUpdated;
};
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('follow-up actions', () => {
  it('does not mutate when confirmation is cancelled', async () => {
    vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: false, isDenied: false, isDismissed: true });
    const accept = vi.spyOn(apiClient, 'acceptQuote');
    const updated = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Aceptó' }));
    await waitFor(() => expect(Swal.fire).toHaveBeenCalled());
    expect(accept).not.toHaveBeenCalled();
    expect(updated).not.toHaveBeenCalled();
  });
  it.each(['Aceptó', 'Rechazó'])('requires confirmation and updates only after API success: %s', async (label) => {
    vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true, isDenied: false, isDismissed: false });
    const result = { ...quote, status: label === 'Aceptó' ? 'accepted' as const : 'rejected' as const };
    const action = vi.spyOn(apiClient, label === 'Aceptó' ? 'acceptQuote' : 'rejectQuote').mockResolvedValue(result);
    const updated = mount();
    fireEvent.click(screen.getByRole('button', { name: label }));
    fireEvent.click(screen.getByRole('button', { name: label }));
    await waitFor(() => expect(updated).toHaveBeenCalledWith(result));
    expect(action).toHaveBeenCalledTimes(1);
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining('Q-000001'), focusCancel: true }));
  });
  it('persists the selected snooze without accepting', async () => {
    vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true, isDenied: false, isDismissed: false, value: '7' });
    const snooze = vi.spyOn(apiClient, 'snoozeQuoteFollowUp').mockResolvedValue({ ...quote, follow_up_at: '2026-11-17T12:00:00Z' });
    const accept = vi.spyOn(apiClient, 'acceptQuote');
    const updated = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Todavía no respondió' }));
    await waitFor(() => expect(updated).toHaveBeenCalled());
    expect(snooze).toHaveBeenCalledWith('q1', 7);
    expect(accept).not.toHaveBeenCalled();
  });
  it('keeps the quote visible on API failure', async () => {
    vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true, isDenied: false, isDismissed: false });
    vi.spyOn(apiClient, 'acceptQuote').mockRejectedValue(new Error('offline'));
    const updated = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Aceptó' }));
    expect((await screen.findByRole('status')).textContent).toContain('No se pudo actualizar');
    expect(updated).not.toHaveBeenCalled();
    expect(screen.getByRole('article', { name: 'Seguimiento Q-000001' })).toBeTruthy();
  });
  it('allows early responses using all issued quotes', () => {
    mount([{ ...quote, follow_up_at: '2026-12-01T12:00:00Z' }]);
    expect(screen.queryByRole('button', { name: 'Aceptó' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Todos los emitidos (1)' }));
    expect(screen.getByRole('button', { name: 'Aceptó' })).toBeTruthy();
  });
});
