import type { Dispatch, SetStateAction } from 'react';

import Swal from 'sweetalert2';

import {
  apiClient,
  type AuditEvent,
  type Client,
  type PlatformTenantMembership,
  type Quote,
  type TenantChangeRequest,
  type TenantSignupRequest,
} from '../../shared/api/client';
import { showSuccessToast } from './dashboardUtils';
import type { PlatformAdminViewProps } from './types';

type PlatformActionHandlers = Pick<
  PlatformAdminViewProps,
  | 'onApproveFiscalChange'
  | 'onApproveSignup'
  | 'onCancelMembershipPayment'
  | 'onMarkMembershipPaid'
  | 'onMarkSignupContacted'
  | 'onRejectFiscalChange'
  | 'onRejectSignup'
  | 'onSendMembershipQuoteByEmail'
  | 'onSendMembershipQuoteByWhatsApp'
  | 'onUpdateMembershipPayment'
>;

type CreatePlatformAdminHandlersArgs = {
  quotes: Quote[];
  refreshPlatformAuditEvents: () => Promise<void>;
  sendInvoiceByWhatsApp: (quote: Quote) => Promise<void>;
  sendQuoteByEmail: (quote: Quote) => Promise<void>;
  setClients: Dispatch<SetStateAction<Client[]>>;
  setIsSaving: Dispatch<SetStateAction<boolean>>;
  setPlatformChangeRequests: Dispatch<SetStateAction<TenantChangeRequest[]>>;
  setPlatformMemberships: Dispatch<SetStateAction<PlatformTenantMembership[]>>;
  setPlatformSignupRequests: Dispatch<SetStateAction<TenantSignupRequest[]>>;
  setQuotes: Dispatch<SetStateAction<Quote[]>>;
  setSelectedQuoteId: Dispatch<SetStateAction<string | null>>;
};

export function createPlatformAdminHandlers({
  quotes,
  refreshPlatformAuditEvents,
  sendInvoiceByWhatsApp,
  sendQuoteByEmail,
  setClients,
  setIsSaving,
  setPlatformChangeRequests,
  setPlatformMemberships,
  setPlatformSignupRequests,
  setQuotes,
  setSelectedQuoteId,
}: CreatePlatformAdminHandlersArgs): PlatformActionHandlers {
  const findQuoteOrWarn = async (quoteId: string | null | undefined) => {
    if (!quoteId) {
      return null;
    }

    const quote = quotes.find((item) => item.id === quoteId);
    if (quote) {
      return quote;
    }

    await Swal.fire({
      title: 'Presupuesto no disponible',
      text: 'Recarga la pantalla para sincronizar el presupuesto generado.',
      icon: 'info',
      confirmButtonText: 'Cerrar',
    });
    return null;
  };

  return {
    onMarkMembershipPaid: async (membership, payload) => {
      setIsSaving(true);
      try {
        const updated = await apiClient.markPlatformMembershipPaid(membership.id, payload);
        const [clientsResponse, quotesResponse] = await Promise.all([apiClient.listClients(), apiClient.listQuotes()]);
        setPlatformMemberships((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setClients(clientsResponse.items);
        setQuotes(quotesResponse.items);
        const latestPayment = updated.payments[0] ?? null;
        if (latestPayment?.quote_id) {
          setSelectedQuoteId(latestPayment.quote_id);
        }
        await refreshPlatformAuditEvents();
        showSuccessToast(
          latestPayment?.quote_number ? `Pago registrado con presupuesto ${latestPayment.quote_number}` : 'Pago registrado',
        );
      } finally {
        setIsSaving(false);
      }
    },
    onUpdateMembershipPayment: async (membership, payment, payload) => {
      setIsSaving(true);
      try {
        const updated = await apiClient.updatePlatformMembershipPayment(membership.id, payment.id, payload);
        const quotesResponse = await apiClient.listQuotes();
        setPlatformMemberships((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setQuotes(quotesResponse.items);
        const updatedPayment = updated.payments.find((item) => item.id === payment.id) ?? null;
        if (updatedPayment?.quote_id) {
          setSelectedQuoteId(updatedPayment.quote_id);
        }
        await refreshPlatformAuditEvents();
        showSuccessToast('Pago actualizado');
      } finally {
        setIsSaving(false);
      }
    },
    onCancelMembershipPayment: async (membership, payment, payload) => {
      setIsSaving(true);
      try {
        const updated = await apiClient.cancelPlatformMembershipPayment(membership.id, payment.id, payload);
        setPlatformMemberships((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        await refreshPlatformAuditEvents();
        showSuccessToast('Pago anulado');
      } finally {
        setIsSaving(false);
      }
    },
    onApproveSignup: async (request, adminPassword) => {
      setIsSaving(true);
      try {
        const updated = await apiClient.approvePlatformSignupRequest(request.id, adminPassword);
        setPlatformSignupRequests((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        const memberships = await apiClient.listPlatformMemberships();
        setPlatformMemberships(memberships.items);
        await refreshPlatformAuditEvents();
        showSuccessToast('Cuenta creada');
      } finally {
        setIsSaving(false);
      }
    },
    onApproveFiscalChange: async (request) => {
      setIsSaving(true);
      try {
        const updated = await apiClient.approvePlatformChangeRequest(request.id);
        setPlatformChangeRequests((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        await refreshPlatformAuditEvents();
        showSuccessToast('Cambio fiscal aprobado');
      } finally {
        setIsSaving(false);
      }
    },
    onMarkSignupContacted: async (request) => {
      setIsSaving(true);
      try {
        const updated = await apiClient.markPlatformSignupRequestContacted(request.id);
        setPlatformSignupRequests((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        await refreshPlatformAuditEvents();
        showSuccessToast('Alta marcada como contactada');
      } finally {
        setIsSaving(false);
      }
    },
    onRejectFiscalChange: async (request) => {
      setIsSaving(true);
      try {
        const updated = await apiClient.rejectPlatformChangeRequest(request.id);
        setPlatformChangeRequests((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        await refreshPlatformAuditEvents();
        showSuccessToast('Cambio fiscal rechazado');
      } finally {
        setIsSaving(false);
      }
    },
    onRejectSignup: async (request) => {
      setIsSaving(true);
      try {
        const updated = await apiClient.rejectPlatformSignupRequest(request.id);
        setPlatformSignupRequests((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        await refreshPlatformAuditEvents();
        showSuccessToast('Alta rechazada');
      } finally {
        setIsSaving(false);
      }
    },
    onSendMembershipQuoteByEmail: async (payment) => {
      const quote = await findQuoteOrWarn(payment.quote_id);
      if (quote) {
        await sendQuoteByEmail(quote);
      }
    },
    onSendMembershipQuoteByWhatsApp: async (payment) => {
      const quote = await findQuoteOrWarn(payment.quote_id);
      if (quote) {
        await sendInvoiceByWhatsApp(quote);
      }
    },
  };
}
