import type { Dispatch, FormEvent, SetStateAction } from 'react';

import Swal from 'sweetalert2';

import {
  apiClient,
  type Client,
  type ClientPayload,
  type ClientServiceRecord,
  type ClientServiceRecordPayload,
} from '../../shared/api/client';
import { compactPayload, showSuccessToast } from './dashboardUtils';
import { nullable } from './helpers';
import { emptyClientForm, emptyServiceRecordForm } from './state';
import type {
  ClientForm,
  ClientRecordRequest,
  ClientRecordSection,
  QuoteForm,
  ServiceRecordForm,
  View,
} from './types';

type CreateClientActionHandlersArgs = {
  clientForm: ClientForm;
  clients: Client[];
  editingClientId: string | null;
  loadWorkspace: () => Promise<void>;
  selectedClientId: string | null;
  serviceRecordForm: ServiceRecordForm;
  setActiveView: Dispatch<SetStateAction<View>>;
  setClientForm: Dispatch<SetStateAction<ClientForm>>;
  setClientRecordRequest: Dispatch<SetStateAction<ClientRecordRequest | null>>;
  setClientServiceRecords: Dispatch<SetStateAction<ClientServiceRecord[]>>;
  setEditingClientId: Dispatch<SetStateAction<string | null>>;
  setIsSaving: Dispatch<SetStateAction<boolean>>;
  setQuoteCreateClientRequestId: Dispatch<SetStateAction<string | null>>;
  setQuoteForm: Dispatch<SetStateAction<QuoteForm>>;
  setSelectedClientId: Dispatch<SetStateAction<string | null>>;
  setSelectedQuoteId: Dispatch<SetStateAction<string | null>>;
  setServiceRecordForm: Dispatch<SetStateAction<ServiceRecordForm>>;
};

type ClientActionHandlers = {
  deleteClient: (client: Client) => Promise<void>;
  editClient: (client: Client) => void;
  handleClientSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleQuickClientCreate: (payload: Pick<ClientPayload, 'name' | 'phone' | 'address'>) => Promise<Client | null>;
  handleServiceRecordSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  openClientHistory: (client: Client) => Promise<void>;
  openClientRecordFromAnotherView: (clientId: string, section?: ClientRecordSection) => Promise<void>;
  openQuoteDraftForClient: (clientId: string) => void;
};

export function createClientActionHandlers({
  clientForm,
  clients,
  editingClientId,
  loadWorkspace,
  selectedClientId,
  serviceRecordForm,
  setActiveView,
  setClientForm,
  setClientRecordRequest,
  setClientServiceRecords,
  setEditingClientId,
  setIsSaving,
  setQuoteCreateClientRequestId,
  setQuoteForm,
  setSelectedClientId,
  setSelectedQuoteId,
  setServiceRecordForm,
}: CreateClientActionHandlersArgs): ClientActionHandlers {
  const openQuoteDraftForClient = (clientId: string) => {
    setQuoteForm((current) => ({ ...current, client_id: clientId }));
    setSelectedQuoteId(null);
    setQuoteCreateClientRequestId(clientId);
    setActiveView('quotes');
  };

  const handleClientSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: ClientPayload = compactPayload(clientForm);

    if (!payload.name || !payload.phone || !payload.address) {
      await Swal.fire({
        title: 'Faltan datos del cliente',
        text: 'Para guardar un cliente completa nombre, telefono y direccion.',
        icon: 'warning',
        confirmButtonText: 'Cerrar',
      });
      return;
    }

    setIsSaving(true);

    try {
      const wasEditing = Boolean(editingClientId);
      if (editingClientId) {
        await apiClient.updateClient(editingClientId, payload);
      } else {
        await apiClient.createClient(payload);
      }

      setClientForm(emptyClientForm);
      setEditingClientId(null);
      await loadWorkspace();
      showSuccessToast(wasEditing ? 'Cliente actualizado' : 'Cliente creado');
    } catch {
      await Swal.fire({
        title: 'No se pudo guardar el cliente',
        text: 'Valida los datos e intenta nuevamente.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickClientCreate = async (payload: Pick<ClientPayload, 'name' | 'phone' | 'address'>) => {
    setIsSaving(true);

    try {
      const createdClient = await apiClient.createClient(payload);
      setClientForm(emptyClientForm);
      setEditingClientId(null);
      setSelectedClientId(createdClient.id);
      setClientServiceRecords([]);
      await loadWorkspace();
      showSuccessToast('Cliente creado');
      return createdClient;
    } catch {
      await Swal.fire({
        title: 'No se pudo crear el cliente',
        text: 'Revisa nombre, telefono y direccion antes de intentar nuevamente.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const editClient = (client: Client) => {
    setEditingClientId(client.id);
    setSelectedClientId(client.id);
    setClientForm({
      name: client.name,
      document: client.document ?? '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      address: client.address ?? '',
      notes: client.notes ?? '',
    });
    setActiveView('clients');
  };

  const openClientHistory = async (client: Client) => {
    setSelectedClientId(client.id);
    setActiveView('clients');

    try {
      const response = await apiClient.listClientServiceRecords(client.id);
      setClientServiceRecords(response.items);
    } catch {
      setClientServiceRecords([]);
      await Swal.fire({
        title: 'No se pudo cargar el historial',
        text: 'Verifica que tu sesion siga vigente e intenta nuevamente.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    }
  };

  const handleServiceRecordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedClientId) {
      return;
    }

    setIsSaving(true);

    const payload: ClientServiceRecordPayload = {
      performed_at: `${serviceRecordForm.performed_at}T00:00:00`,
      title: serviceRecordForm.title.trim(),
      description: nullable(serviceRecordForm.description),
      amount: nullable(serviceRecordForm.amount),
    };

    if (!serviceRecordForm.performed_at || !payload.title) {
      await Swal.fire({
        title: 'Faltan datos del historial',
        text: 'Carga fecha y titulo del servicio realizado.',
        icon: 'warning',
        confirmButtonText: 'Cerrar',
      });
      return;
    }

    try {
      await apiClient.createClientServiceRecord(selectedClientId, payload);
      const response = await apiClient.listClientServiceRecords(selectedClientId);
      setClientServiceRecords(response.items);
      setServiceRecordForm(emptyServiceRecordForm);
      showSuccessToast('Historial actualizado');
    } catch {
      await Swal.fire({
        title: 'No se pudo guardar el servicio',
        text: 'Revisa fecha, titulo e importe e intenta nuevamente.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteClient = async (client: Client) => {
    const result = await Swal.fire({
      title: `Eliminar ${client.name}`,
      text: 'El cliente dejara de estar disponible para nuevos presupuestos, manteniendo su historial.',
      icon: 'warning',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      showCancelButton: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await apiClient.deleteClient(client.id);
      if (selectedClientId === client.id) {
        setSelectedClientId(null);
        setClientServiceRecords([]);
      }
      await loadWorkspace();
      showSuccessToast('Cliente eliminado');
    } catch {
      await Swal.fire({
        title: 'No se pudo eliminar el cliente',
        text: 'Revisa que tu sesion siga vigente e intenta nuevamente.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    }
  };

  const openClientRecordFromAnotherView = async (clientId: string, section: ClientRecordSection = 'data') => {
    const client = clients.find((currentClient) => currentClient.id === clientId);

    if (!client) {
      return;
    }

    setClientRecordRequest({ clientId, section });
    await openClientHistory(client);
  };

  return {
    deleteClient,
    editClient,
    handleClientSubmit,
    handleQuickClientCreate,
    handleServiceRecordSubmit,
    openClientHistory,
    openClientRecordFromAnotherView,
    openQuoteDraftForClient,
  };
}
