import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Swal from 'sweetalert2';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlatformTenantMembership } from '../../../shared/api/client';
import { showSuccessToast } from '../dashboardUtils';
import type { PlatformAdminViewProps } from '../types';
import { PlatformAdminView } from './PlatformAdminView';

function setup(name: string, notes = 'Transferencia "noviembre" & saldo') {
  const membership: PlatformTenantMembership = {
    id: 'tenant-1', name, legal_name: null, tax_id: null, email: null, phone: null,
    membership_status: 'active', membership_due_date: '2099-12-01',
    membership_last_payment_at: '2026-11-01', membership_monthly_fee: '100',
    payments: [{
      id: 'payment-1', paid_at: '2026-11-01T12:00:00', months_covered: 3,
      amount: '300.00', status: 'active', cancelled_at: null, cancel_reason: null,
      quote_id: null, quote_number: null, notes,
    }],
  };
  const props: PlatformAdminViewProps = {
    activeSection: 'memberships', auditEvents: [], auditFilters: {}, changeRequests: [],
    hasMoreAuditEvents: false, isAuditLoading: false, isCompactLayout: false, isSaving: false,
    memberships: [membership], signupRequests: [],
    onAuditFilterChange: vi.fn(), onAuditLoadMore: vi.fn(), onAuditResetFilters: vi.fn(),
    onChangeSection: vi.fn(), onApproveFiscalChange: vi.fn(), onApproveSignup: vi.fn(),
    onMarkMembershipPaid: vi.fn(), onUpdateMembershipPayment: vi.fn(),
    onCancelMembershipPayment: vi.fn(), onMarkSignupContacted: vi.fn(),
    onRejectFiscalChange: vi.fn(), onRejectSignup: vi.fn(),
    onSendMembershipQuoteByEmail: vi.fn(), onSendMembershipQuoteByWhatsApp: vi.fn(),
  };
  render(<PlatformAdminView {...props} />);
  return { membership, props };
}

function input(id: string) {
  return document.getElementById(id) as HTMLInputElement;
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  // jsdom does not implement the media query API used by SweetAlert's success icon.
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => {
  Swal.close();
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('payment dialogs keep stored content as text', () => {
  for (const name of ['<img src=x onerror="alert(1)">', '<svg onload="alert(1)"></svg>']) {
    for (const action of ['Registrar pago', 'Editar pago', 'Anular pago']) {
      it(`${action} does not parse company markup: ${name}`, () => {
        setup(name);
        if (action !== 'Registrar pago') fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
        fireEvent.click(screen.getByRole('button', { name: action }));

        // Real SweetAlert renderer, not an assertion against mocked options.
        expect(Swal.getTitle()?.innerText).toBe(`${action} de ${name}`);
        expect(Swal.getTitle()?.querySelector('img, svg, script, [onerror], [onload]')).toBeNull();
      });
    }
  }

  it.each([
    '"><img src=x onerror="alert(1)">',
    '" autofocus onfocus="alert(1)',
    'Transferencia "noviembre" & saldo',
  ])('preserves notes in the input and confirmed update: %s', async (notes) => {
    const { membership, props } = setup('Empresa & Asociados', notes);
    fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar pago' }));
    expect(input('membership-notes-edit').value).toBe(notes);
    expect(Swal.getHtmlContainer()?.querySelector('img, svg, script, [onerror], [onfocus], [autofocus]')).toBeNull();
    fireEvent.click(Swal.getConfirmButton()!);
    await waitFor(() => expect(props.onUpdateMembershipPayment).toHaveBeenCalledWith(
      membership, membership.payments[0], {
        paid_at: '2026-11-01', months_covered: 3, amount: '300.00', notes,
      },
    ));
  });

  it('still registers and cancels payments with ordinary input', async () => {
    const { membership, props } = setup('Empresa de prueba');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar pago' }));
    fireEvent.change(input('membership-amount'), { target: { value: '100' } });
    fireEvent.change(input('membership-notes'), { target: { value: 'Transferencia' } });
    fireEvent.click(Swal.getConfirmButton()!);
    await waitFor(() => expect(props.onMarkMembershipPaid).toHaveBeenCalledWith(membership, {
      months_covered: 1, amount: '100', notes: 'Transferencia',
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
    fireEvent.click(screen.getByRole('button', { name: 'Anular pago' }));
    fireEvent.change(input('membership-cancel-reason'), { target: { value: 'Pago duplicado' } });
    fireEvent.click(Swal.getConfirmButton()!);
    await waitFor(() => expect(props.onCancelMembershipPayment).toHaveBeenCalledWith(
      membership, membership.payments[0], { reason: 'Pago duplicado' },
    ));
  });

  it('does not parse markup in shared success toasts', () => {
    const title = '<img src=x onerror="alert(1)">';
    showSuccessToast(title);
    expect(Swal.getTitle()?.innerText).toBe(title);
    expect(Swal.getTitle()?.querySelector('img')).toBeNull();
  });
});
