import type { Dispatch, FormEvent, SetStateAction } from 'react';

import Swal from 'sweetalert2';

import {
  apiClient,
  buildCriticalErrorMessage,
  type Client,
  type CostItem,
  type Quote,
  type QuoteItemPayload,
  type QuotePayload,
  type TenantProfile,
} from '../../shared/api/client';
import {
  buildGreetingByBuenosAiresTime,
  buildWhatsAppInvoiceMessage,
  quoteTransitionSuccessMessage,
  showSuccessToast,
} from './dashboardUtils';
import {
  downloadBlob,
  formatMoney,
  nullable,
  openMailTo,
  openWhatsAppMessage,
} from './helpers';
import { emptyQuoteForm } from './state';
import type { ClientRecordSection, QuoteForm, View } from './types';

type QuoteActionHandlers = {
  addQuoteItemFromCatalog: (quote: Quote, item: CostItem) => Promise<void>;
  deleteQuoteItem: (quote: Quote, itemId: string) => Promise<void>;
  deleteQuotes: (quotesToDelete: Quote[]) => Promise<boolean>;
  downloadQuotePdf: (quote: Quote) => Promise<void>;
  handleQuoteSubmit: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
  openQuoteDraftForClient: (clientId: string) => void;
  openQuoteEditorFromAnotherView: (quoteId: string) => void;
  sendInvoiceByWhatsApp: (quote: Quote) => Promise<void>;
  sendQuoteByEmail: (quote: Quote) => Promise<void>;
  transitionQuote: (quote: Quote, action: 'issue' | 'accept' | 'reject') => Promise<void>;
};

type CreateQuoteActionHandlersArgs = {
  clients: Client[];
  companyProfile: TenantProfile | null;
  loadWorkspace: () => Promise<void>;
  quoteForm: QuoteForm;
  setActiveView: Dispatch<SetStateAction<View>>;
  setIsSaving: Dispatch<SetStateAction<boolean>>;
  setQuoteCreateClientRequestId: Dispatch<SetStateAction<string | null>>;
  setQuoteEditorRequestId: Dispatch<SetStateAction<string | null>>;
  setQuoteForm: Dispatch<SetStateAction<QuoteForm>>;
  setSelectedQuoteId: Dispatch<SetStateAction<string | null>>;
};

export function createQuoteActionHandlers({
  clients,
  companyProfile,
  loadWorkspace,
  quoteForm,
  setActiveView,
  setIsSaving,
  setQuoteCreateClientRequestId,
  setQuoteEditorRequestId,
  setQuoteForm,
  setSelectedQuoteId,
}: CreateQuoteActionHandlersArgs): QuoteActionHandlers {
  const handleQuoteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: QuotePayload = {
      client_id: quoteForm.client_id,
      title: nullable(quoteForm.title),
      notes: nullable(quoteForm.notes),
      valid_until: quoteForm.valid_until ? `${quoteForm.valid_until}T00:00:00` : null,
    };

    if (!payload.client_id) {
      await Swal.fire({
        title: 'Selecciona un cliente',
        text: 'Para crear un presupuesto primero hay que elegir el cliente.',
        icon: 'warning',
        confirmButtonText: 'Cerrar',
      });
      return false;
    }

    setIsSaving(true);

    try {
      const quote = await apiClient.createQuote(payload);
      setQuoteForm(emptyQuoteForm);
      setSelectedQuoteId(quote.id);
      await loadWorkspace();
      showSuccessToast('Presupuesto creado');
      return true;
    } catch {
      await Swal.fire({
        title: 'No se pudo crear el presupuesto',
        text: 'Selecciona un cliente valido e intenta nuevamente.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const addQuoteItemFromCatalog = async (quote: Quote, item: CostItem) => {
    if (quote.status !== 'draft') {
      return;
    }

    setIsSaving(true);

    const payload: QuoteItemPayload = {
      source_cost_item_id: item.id,
      quantity: '1',
      discount_amount: '0',
    };

    try {
      await apiClient.addQuoteItem(quote.id, payload);
      await loadWorkspace();
      showSuccessToast(`${item.name} agregado`);
    } catch {
      await Swal.fire({
        title: 'No se pudo agregar el item',
        text: 'El presupuesto debe estar en borrador y el servicio debe estar activo.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const transitionQuote = async (quote: Quote, action: 'issue' | 'accept' | 'reject') => {
    try {
      if (action === 'issue') {
        await apiClient.issueQuote(quote.id);
      } else if (action === 'accept') {
        await apiClient.acceptQuote(quote.id);
      } else {
        await apiClient.rejectQuote(quote.id);
      }

      await loadWorkspace();
      showSuccessToast(quoteTransitionSuccessMessage(action));
    } catch (error) {
      await Swal.fire({
        title: 'No se pudo cambiar el estado',
        text: buildCriticalErrorMessage(
          'Recorda que solo se emiten borradores, y solo lo emitido puede aceptarse o rechazarse.',
          error,
        ),
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    }
  };

  const deleteQuoteItem = async (quote: Quote, itemId: string) => {
    try {
      await apiClient.deleteQuoteItem(quote.id, itemId);
      await loadWorkspace();
      showSuccessToast('Item eliminado');
    } catch {
      await Swal.fire({
        title: 'No se pudo eliminar el item',
        text: 'El presupuesto debe estar en borrador para modificar sus items.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    }
  };

  const deleteQuotes = async (quotesToDelete: Quote[]) => {
    if (quotesToDelete.length === 0) {
      return false;
    }

    const riskyQuotes = quotesToDelete.filter((quote) => quote.status === 'issued' || quote.status === 'accepted');
    const result = await Swal.fire({
      title: `Eliminar ${quotesToDelete.length} presupuesto${quotesToDelete.length === 1 ? '' : 's'}`,
      text: riskyQuotes.length
        ? 'Se eliminaran definitivamente. Incluye presupuestos emitidos o aceptados, asi que la tesoreria y los historiales se recalcularan sin posibilidad de recuperarlos.'
        : 'Se eliminaran definitivamente de la base y la tesoreria se recalculara automaticamente.',
      icon: 'warning',
      confirmButtonText: riskyQuotes.length ? 'Eliminar definitivamente' : 'Eliminar',
      cancelButtonText: 'Cancelar',
      showCancelButton: true,
    });

    if (!result.isConfirmed) {
      return false;
    }

    setIsSaving(true);
    try {
      await apiClient.bulkDeleteQuotes({ quote_ids: quotesToDelete.map((quote) => quote.id) });
      await loadWorkspace();
      showSuccessToast(
        `${quotesToDelete.length} presupuesto${quotesToDelete.length === 1 ? '' : 's'} eliminado${quotesToDelete.length === 1 ? '' : 's'}`,
      );
      return true;
    } catch (error) {
      await Swal.fire({
        title: 'No se pudieron eliminar los presupuestos',
        text: buildCriticalErrorMessage(
          'Intenta nuevamente en unos segundos. La tesoreria solo se actualiza cuando la eliminacion termina correctamente.',
          error,
        ),
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const downloadQuotePdf = async (quote: Quote) => {
    try {
      const blob = await apiClient.downloadQuotePdf(quote.id);
      downloadBlob(blob, `presupuesto-${quote.number}.pdf`);
      showSuccessToast('PDF descargado');
    } catch {
      await Swal.fire({
        title: 'No se pudo descargar el PDF',
        text: 'Verifica que el backend este activo y tu sesion siga vigente.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    }
  };

  const sendInvoiceByWhatsApp = async (quote: Quote) => {
    const client = clients.find((currentClient) => currentClient.id === quote.client_id);
    const phone = client?.phone?.replace(/\D/g, '') ?? '';
    const companyName = companyProfile?.legal_name || companyProfile?.name || 'nuestra empresa';
    const message = buildWhatsAppInvoiceMessage({
      clientName: client?.name,
      companyName,
      quote,
    });
    const filename = `factura-${quote.number}.pdf`;

    try {
      const blob = await apiClient.downloadQuotePdf(quote.id);
      const nav = navigator as Navigator & {
        canShare?: (data: { files?: File[] }) => boolean;
        share?: (data: { files?: File[]; text?: string; title?: string }) => Promise<void>;
      };
      const canTryFileShare = typeof nav.canShare === 'function' && typeof nav.share === 'function';
      const file = canTryFileShare ? new File([blob], filename, { type: 'application/pdf' }) : null;

      if (file && nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({
          files: [file],
          text: message,
          title: `Factura ${quote.number}`,
        });
        return;
      }

      try {
        downloadBlob(blob, filename);
      } catch {
        // Some embedded browsers block synthetic downloads; WhatsApp still opens with the prepared message.
      }
      openWhatsAppMessage(phone, message);
    } catch {
      openWhatsAppMessage(phone, message);
    }
  };

  const sendQuoteByEmail = async (quote: Quote) => {
    const client = clients.find((currentClient) => currentClient.id === quote.client_id);
    const companyName = companyProfile?.legal_name || companyProfile?.name || 'FacturEasy';
    const greeting = buildGreetingByBuenosAiresTime();
    const subject = `Presupuesto ${quote.number} - ${companyName}`;

    try {
      const shareLink = await apiClient.createQuoteShareLink(quote.id);
      const body = [
        `${greeting}${client?.name ? ` ${client.name}` : ''},`,
        '',
        `Te compartimos el presupuesto ${quote.number} de ${companyName}.`,
        `Total: ${formatMoney(quote.total)}`,
        '',
        `PDF: ${shareLink.url}`,
      ].join('\n');
      openMailTo(client?.email ?? '', subject, body);
    } catch {
      await Swal.fire({
        title: 'No se pudo preparar el email',
        text: 'Verifica que el backend este activo y vuelve a intentar.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    }
  };

  const openQuoteEditorFromAnotherView = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    setQuoteEditorRequestId(quoteId);
    setActiveView('quotes');
  };

  const openQuoteDraftForClient = (clientId: string) => {
    setQuoteForm({ ...emptyQuoteForm, client_id: clientId });
    setSelectedQuoteId(null);
    setQuoteCreateClientRequestId(clientId);
    setActiveView('quotes');
  };

  return {
    addQuoteItemFromCatalog,
    deleteQuoteItem,
    deleteQuotes,
    downloadQuotePdf,
    handleQuoteSubmit,
    openQuoteDraftForClient,
    openQuoteEditorFromAnotherView,
    sendInvoiceByWhatsApp,
    sendQuoteByEmail,
    transitionQuote,
  };
}
