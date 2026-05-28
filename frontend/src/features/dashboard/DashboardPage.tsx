import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Swal from 'sweetalert2';

import {
  apiClient,
  Client,
  ClientPayload,
  ClientServiceRecord,
  ClientServiceRecordPayload,
  CostCategory,
  CostItem,
  CostItemPayload,
  CurrentUser,
  ExpenseCategory,
  ExpenseEntry,
  ExpenseEntryPayload,
  ExpenseStatus,
  Quote,
  QuoteItemPayload,
  QuotePayload,
  QuoteStatus,
  PlatformTenantMembership,
  TenantProfile,
  TenantChangeRequest,
  TenantSignupRequest,
  TenantChangeRequestPayload,
  TenantProfilePayload,
} from '../../shared/api/client';
import { categoryLabels, statusLabels } from './constants';
import { buildDashboardMetrics, buildDashboardNavigation } from './dashboardDerivations';
import {
  buildGreetingByBuenosAiresTime,
  buildInvoiceHtml,
  buildWhatsAppInvoiceMessage,
  companyProfileToForm,
  compactPayload,
  escapeHtml,
  quoteTransitionSuccessMessage,
  showSuccessToast,
  themeVariables,
} from './dashboardUtils';
import {
  clientName,
  downloadBlob,
  formatDate,
  formatMoney,
  matchesSearch,
  nullable,
  openMailTo,
  openWhatsAppMessage,
} from './helpers';
import { buildPlatformNotifications } from './platformNotifications';
import { createPlatformAdminHandlers } from './platformAdminActions';
import {
  emptyClientForm,
  emptyCompanyProfileForm,
  emptyCostForm,
  emptyExpenseForm,
  emptyQuoteForm,
  emptyServiceRecordForm,
  emptyTenantLegalChangeForm,
} from './state';
import { styles } from './styles';
import {
  DashboardBottomTabs,
  DashboardSidebar,
  DashboardTopbar,
  MobileDashboardDrawer,
  MobileDashboardHeader,
  PlatformNotificationsPanel,
} from './shell';
import { Field, QuoteProgress, StatusBadge } from './ui';
import type {
  ClientForm,
  ClientRecordRequest,
  ClientRecordSection,
  CompanyProfileForm,
  CostForm,
  ExpenseForm,
  PlatformSection,
  QuoteForm,
  ServiceRecordForm,
  TenantLegalChangeForm,
  View,
} from './types';
import { ClientsView } from './views/ClientsView';
import { CompanyProfileView } from './views/CompanyProfileView';
import { CostsView } from './views/CostsView';
import { QuotesView } from './views/QuotesView';
import { SummaryView } from './views/SummaryView';
import { TreasuryView } from './views/TreasuryView';
import { PlatformAdminView } from './views/PlatformAdminView';

type DashboardPageProps = {
  onLogout: () => void;
};

export function DashboardPage({ onLogout }: DashboardPageProps) {
  const [activeView, setActiveView] = useState<View>('summary');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activePlatformSection, setActivePlatformSection] = useState<PlatformSection>('overview');
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientServiceRecords, setClientServiceRecords] = useState<ClientServiceRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [companyProfile, setCompanyProfile] = useState<TenantProfile | null>(null);
  const [tenantChangeRequests, setTenantChangeRequests] = useState<TenantChangeRequest[]>([]);
  const [platformChangeRequests, setPlatformChangeRequests] = useState<TenantChangeRequest[]>([]);
  const [platformSignupRequests, setPlatformSignupRequests] = useState<TenantSignupRequest[]>([]);
  const [platformMemberships, setPlatformMemberships] = useState<PlatformTenantMembership[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>([]);
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clientForm, setClientForm] = useState<ClientForm>(emptyClientForm);
  const [companyProfileForm, setCompanyProfileForm] = useState<CompanyProfileForm>(emptyCompanyProfileForm);
  const [tenantLegalChangeForm, setTenantLegalChangeForm] = useState<TenantLegalChangeForm>(
    emptyTenantLegalChangeForm,
  );
  const [serviceRecordForm, setServiceRecordForm] = useState<ServiceRecordForm>(emptyServiceRecordForm);
  const [costForm, setCostForm] = useState<CostForm>(emptyCostForm);
  const [quoteForm, setQuoteForm] = useState<QuoteForm>(emptyQuoteForm);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(emptyExpenseForm);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [quoteEditorRequestId, setQuoteEditorRequestId] = useState<string | null>(null);
  const [quoteCreateClientRequestId, setQuoteCreateClientRequestId] = useState<string | null>(null);
  const [clientRecordRequest, setClientRecordRequest] = useState<ClientRecordRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isCompactLayout = viewportWidth < 860;

  const metrics = buildDashboardMetrics(clients, costItems, quotes);

  const loadWorkspace = async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [
        userResponse,
        profileResponse,
        changeRequestsResponse,
        clientsResponse,
        costsResponse,
        quotesResponse,
        expenseCategoriesResponse,
        expenseEntriesResponse,
      ] = await Promise.all([
        apiClient.getCurrentUser(),
        apiClient.getTenantProfile(),
        apiClient.listTenantChangeRequests(),
        apiClient.listClients(),
        apiClient.listCostItems(),
        apiClient.listQuotes(),
        apiClient.listExpenseCategories(),
        apiClient.listExpenseEntries(),
      ]);
      setCurrentUser(userResponse);
      setCompanyProfile(profileResponse);
      setCompanyProfileForm(companyProfileToForm(profileResponse));
      setTenantChangeRequests(changeRequestsResponse.items);
      setClients(clientsResponse.items);
      setCostItems(costsResponse.items);
      setQuotes(quotesResponse.items);
      setExpenseCategories(expenseCategoriesResponse.items);
      setExpenseEntries(expenseEntriesResponse.items);
      setSelectedQuoteId((current) => {
        if (current && quotesResponse.items.some((quote) => quote.id === current)) {
          return current;
        }

        return quotesResponse.items[0]?.id ?? null;
      });
      if (userResponse.role === 'platform_admin') {
        const [signupRequests, changeRequests, memberships] = await Promise.all([
          apiClient.listPlatformSignupRequests(),
          apiClient.listPlatformChangeRequests(),
          apiClient.listPlatformMemberships(),
        ]);
        setPlatformSignupRequests(signupRequests.items);
        setPlatformChangeRequests(changeRequests.items);
        setPlatformMemberships(memberships.items);
        setActiveView((current) => (current === 'summary' || current === 'company' ? 'platform' : current));
      }
    } catch {
      setLoadError('No pude cargar los datos. Revisá que el backend esté activo y que tu sesión siga vigente.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, []);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleTheme = () => {
    setIsDarkMode((current) => {
      const next = !current;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
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
        text: 'Validá los datos e intentá nuevamente.',
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

  const handleCostSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: CostItemPayload = {
      category: 'services',
      name: costForm.name.trim(),
      description: nullable(costForm.description),
      unit: 'servicio',
      unit_cost: costForm.unit_cost,
      tax_rate: nullable(costForm.tax_rate),
    };

    if (!payload.name || !payload.unit_cost) {
      await Swal.fire({
        title: 'Faltan datos del servicio',
        text: 'Carga el nombre del servicio y el precio antes de guardar.',
        icon: 'warning',
        confirmButtonText: 'Cerrar',
      });
      return;
    }

    setIsSaving(true);

    try {
      const wasEditing = Boolean(editingCostId);
      if (editingCostId) {
        await apiClient.updateCostItem(editingCostId, payload);
      } else {
        await apiClient.createCostItem(payload);
      }

      setCostForm(emptyCostForm);
      setEditingCostId(null);
      await loadWorkspace();
      showSuccessToast(wasEditing ? 'Servicio actualizado' : 'Servicio creado');
    } catch {
      await Swal.fire({
        title: 'No se pudo guardar el servicio',
        text: 'Revisá importe, unidad e IVA. El IVA vacío usa el valor general de la empresa.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExpenseSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!expenseForm.amount || !expenseForm.detail.trim()) {
      await Swal.fire({
        title: 'Faltan datos del gasto',
        text: 'Completa monto y detalle para registrar el gasto.',
        icon: 'warning',
        confirmButtonText: 'Cerrar',
      });
      return;
    }

    const payload: ExpenseEntryPayload = {
      amount: expenseForm.amount,
      detail: expenseForm.detail.trim(),
      notes: nullable(expenseForm.notes),
      status: expenseForm.status,
      client_id: expenseForm.client_id || null,
      category_id: expenseForm.category_id || null,
    };

    setIsSaving(true);
    try {
      await apiClient.createExpenseEntry(payload);
      setExpenseForm(emptyExpenseForm);
      await loadWorkspace();
      showSuccessToast('Gasto registrado');
    } catch {
      await Swal.fire({
        title: 'No se pudo registrar el gasto',
        text: 'Revisa el monto, detalle y los datos opcionales antes de intentar nuevamente.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExpenseStatusChange = async (entry: ExpenseEntry, status: ExpenseStatus) => {
    setIsSaving(true);
    try {
      await apiClient.updateExpenseEntry(entry.id, { status });
      await loadWorkspace();
      showSuccessToast(status === 'paid' ? 'Gasto marcado como cobrado' : 'Gasto marcado como pendiente');
    } catch {
      await Swal.fire({
        title: 'No se pudo actualizar el gasto',
        text: 'Intenta nuevamente en unos segundos.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleManageExpenseCategories = async () => {
    const currentCategories = expenseCategories
      .map((category) => `<li style="margin:0 0 6px;">${escapeHtml(category.name)}</li>`)
      .join('');

    const result = await Swal.fire({
      title: 'Administrar categorias',
      html: `
        <div style="display:grid;gap:12px;text-align:left;">
          <div>
            <strong style="display:block;margin-bottom:8px;">Categorias actuales</strong>
            <ul style="margin:0;padding-left:18px;color:#64748b;">
              ${currentCategories || '<li>Sin categorias cargadas</li>'}
            </ul>
          </div>
          <label style="display:grid;gap:6px;">
            <span>Nueva categoria</span>
            <input id="expense-category-name" class="swal2-input" placeholder="Ej. Materiales de stock" style="margin:0;" />
          </label>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Agregar categoria',
      cancelButtonText: 'Cerrar',
      preConfirm: () => {
        const nameValue = (document.getElementById('expense-category-name') as HTMLInputElement | null)?.value.trim() ?? '';
        if (!nameValue) {
          Swal.showValidationMessage('Escribe un nombre para la categoria.');
          return undefined;
        }
        return { name: nameValue };
      },
    });

    if (!result.isConfirmed || !result.value) {
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.createExpenseCategory(result.value);
      await loadWorkspace();
      showSuccessToast('Categoria creada');
    } catch {
      await Swal.fire({
        title: 'No se pudo crear la categoria',
        text: 'Intenta nuevamente con otro nombre.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
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

  const handleCompanyProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    const payload: TenantProfilePayload = {
      address: nullable(companyProfileForm.address),
      phone: nullable(companyProfileForm.phone),
      email: nullable(companyProfileForm.email),
      website: nullable(companyProfileForm.website),
      logo_url: nullable(companyProfileForm.logo_url),
      invoice_notes: nullable(companyProfileForm.invoice_notes),
      default_tax_rate: nullable(companyProfileForm.default_tax_rate),
    };

    try {
      const updatedProfile = await apiClient.updateTenantProfile(payload);
      setCompanyProfile(updatedProfile);
      setCompanyProfileForm(companyProfileToForm(updatedProfile));
      await Swal.fire({
        title: 'Perfil actualizado',
        text: 'Los datos de empresa ya estan disponibles para impresiones y facturas.',
        icon: 'success',
        confirmButtonText: 'Cerrar',
      });
    } catch {
      await Swal.fire({
        title: 'No se pudo guardar el perfil',
        text: 'Revisa los datos e intenta nuevamente.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTenantLegalChangeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: TenantChangeRequestPayload = {
      proposed_name: nullable(tenantLegalChangeForm.proposed_name),
      proposed_legal_name: nullable(tenantLegalChangeForm.proposed_legal_name),
      proposed_tax_id: nullable(tenantLegalChangeForm.proposed_tax_id),
      reason: nullable(tenantLegalChangeForm.reason),
    };

    if (!payload.proposed_name && !payload.proposed_legal_name && !payload.proposed_tax_id) {
      await Swal.fire({
        title: 'Faltan datos',
        text: 'Indica al menos un cambio fiscal para enviar la solicitud.',
        icon: 'warning',
        confirmButtonText: 'Cerrar',
      });
      return;
    }

    setIsSaving(true);

    try {
      const request = await apiClient.createTenantChangeRequest(payload);
      setTenantChangeRequests((current) => [request, ...current]);
      setTenantLegalChangeForm(emptyTenantLegalChangeForm);
      showSuccessToast('Solicitud enviada');
    } catch {
      await Swal.fire({
        title: 'No se pudo enviar la solicitud',
        text: 'Revisa los datos e intenta nuevamente.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    } finally {
      setIsSaving(false);
    }
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

  const editCost = (item: CostItem) => {
    setEditingCostId(item.id);
    setCostForm({
      category: item.category,
      name: item.name,
      description: item.description ?? '',
      unit: item.unit,
      unit_cost: item.unit_cost,
      tax_rate: item.tax_rate ?? '',
    });
    setActiveView('costs');
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

  const deleteCost = async (item: CostItem) => {
    const result = await Swal.fire({
      title: `Desactivar ${item.name}`,
      text: 'El costo no se usará para nuevos presupuestos, pero mantiene el historial.',
      icon: 'warning',
      confirmButtonText: 'Desactivar',
      cancelButtonText: 'Cancelar',
      showCancelButton: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await apiClient.deleteCostItem(item.id);
      await loadWorkspace();
      showSuccessToast('Servicio desactivado');
    } catch {
      await Swal.fire({
        title: 'No se pudo desactivar el servicio',
        text: 'Revisa que tu sesion siga vigente e intenta nuevamente.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    }
  };

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
    } catch {
      await Swal.fire({
        title: 'No se pudo cambiar el estado',
        text: 'Recorda que solo se emiten borradores, y solo lo emitido puede aceptarse o rechazarse.',
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
    } catch {
      await Swal.fire({
        title: 'No se pudieron eliminar los presupuestos',
        text: 'Intenta nuevamente en unos segundos. La tesoreria solo se actualiza cuando la eliminacion termina correctamente.',
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

  const openClientRecordFromAnotherView = async (clientId: string, section: ClientRecordSection = 'data') => {
    const client = clients.find((currentClient) => currentClient.id === clientId);

    if (!client) {
      return;
    }

    setClientRecordRequest({ clientId, section });
    await openClientHistory(client);
  };

  const {
    bottomNavigationItems,
    currentViewLabel,
    mobileDrawerAccountItems,
    mobileDrawerNavigationItems,
    navigationItems,
    platformAccountActions,
  } = buildDashboardNavigation(currentUser, activeView);
  const platformNotifications =
    currentUser?.role === 'platform_admin'
      ? buildPlatformNotifications(platformSignupRequests, platformChangeRequests, platformMemberships)
      : [];
  const pendingNotificationCount = platformNotifications.length;
  const signupNotifications = platformNotifications.filter((item) => item.kind === 'signup');
  const changeNotifications = platformNotifications.filter((item) => item.kind === 'change_request');
  const membershipNotifications = platformNotifications.filter((item) => item.kind === 'membership');
  const goToView = (view: View) => {
    setActiveView(view);
    if (view === 'platform') {
      setActivePlatformSection('overview');
    }
    setIsMobileMenuOpen(false);
  };
  const openPlatformNotifications = (section: PlatformSection) => {
    setActiveView('platform');
    setActivePlatformSection(section);
    setIsNotificationsOpen(false);
    setIsMobileMenuOpen(false);
  };
  const platformAdminHandlers = createPlatformAdminHandlers({
    quotes,
    sendInvoiceByWhatsApp,
    sendQuoteByEmail,
    setClients,
    setIsSaving,
    setPlatformChangeRequests,
    setPlatformMemberships,
    setPlatformSignupRequests,
    setQuotes,
    setSelectedQuoteId,
  });

  return (
    <main
      style={{
        ...styles.page,
        ...themeVariables(isDarkMode),
        ...(isCompactLayout ? styles.pageCompact : null),
      }}
    >
      {isCompactLayout ? (
        <>
          <MobileDashboardHeader
            currentUser={currentUser}
            currentViewLabel={currentViewLabel}
            onOpenMenu={() => setIsMobileMenuOpen(true)}
            onToggleNotifications={() => setIsNotificationsOpen((current) => !current)}
            pendingNotificationCount={pendingNotificationCount}
          />
          {isMobileMenuOpen ? (
            <MobileDashboardDrawer
              accountItems={mobileDrawerAccountItems}
              activeView={activeView}
              isDarkMode={isDarkMode}
              navigationItems={mobileDrawerNavigationItems}
              onClose={() => setIsMobileMenuOpen(false)}
              onLogout={onLogout}
              onToggleTheme={toggleTheme}
              onViewChange={goToView}
            />
          ) : null}
        </>
      ) : (
        <DashboardSidebar
          activeView={activeView}
          isCollapsed={isSidebarCollapsed}
          isCompactLayout={isCompactLayout}
          items={navigationItems}
          onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
          onViewChange={goToView}
        />
      )}

      <section style={{ ...styles.content, ...(isCompactLayout ? styles.contentCompact : null) }}>
        <div style={{ ...styles.topbar, ...(isCompactLayout ? styles.topbarMobileHidden : null) }}>
          <DashboardTopbar
            accountItems={platformAccountActions}
            activeView={activeView}
            currentUser={currentUser}
            isDarkMode={isDarkMode}
            onLogout={onLogout}
            onToggleNotifications={() => setIsNotificationsOpen((current) => !current)}
            onToggleTheme={toggleTheme}
            onViewChange={goToView}
            pendingNotificationCount={pendingNotificationCount}
          />
        </div>

        {loadError ? <p style={styles.errorBanner}>{loadError}</p> : null}

        {isNotificationsOpen && currentUser?.role === 'platform_admin' ? (
          <PlatformNotificationsPanel
            changeNotifications={changeNotifications}
            membershipNotifications={membershipNotifications}
            onClose={() => setIsNotificationsOpen(false)}
            onOpenSection={openPlatformNotifications}
            pendingNotificationCount={pendingNotificationCount}
            signupNotifications={signupNotifications}
          />
        ) : null}

        {activeView === 'summary' ? (
          <SummaryView
            clients={clients}
            costItems={costItems}
            isLoading={isLoading}
            metrics={metrics}
            onNewQuote={() => setActiveView('quotes')}
            onOpenQuote={openQuoteEditorFromAnotherView}
            quotes={quotes}
          />
        ) : null}

        {activeView === 'clients' ? (
          <ClientsView
            clients={clients}
            form={clientForm}
            isCompactLayout={isCompactLayout}
            isSaving={isSaving}
            editingClientId={editingClientId}
            recordRequest={clientRecordRequest}
            selectedClientId={selectedClientId}
            quotes={quotes}
            serviceRecordForm={serviceRecordForm}
            serviceRecords={clientServiceRecords}
            onCancel={() => {
              setClientForm(emptyClientForm);
              setEditingClientId(null);
            }}
            onCreateQuoteForClient={openQuoteDraftForClient}
            onDelete={deleteClient}
            onEdit={editClient}
            onFormChange={setClientForm}
            onHistory={openClientHistory}
            onOpenQuote={openQuoteEditorFromAnotherView}
            onQuickCreate={handleQuickClientCreate}
            onRecordRequestHandled={() => setClientRecordRequest(null)}
            onServiceFormChange={setServiceRecordForm}
            onServiceSubmit={handleServiceRecordSubmit}
            onSubmit={handleClientSubmit}
          />
        ) : null}

        {activeView === 'costs' ? (
          <CostsView
            costItems={costItems}
            editingCostId={editingCostId}
            form={costForm}
            isSaving={isSaving}
            onCancel={() => {
              setCostForm(emptyCostForm);
              setEditingCostId(null);
            }}
            onDelete={deleteCost}
            onEdit={editCost}
            onFormChange={setCostForm}
            onSubmit={handleCostSubmit}
            showOperationPresets={currentUser?.role !== 'platform_admin'}
          />
        ) : null}

        {activeView === 'quotes' ? (
          <QuotesView
            clients={clients}
            costItems={costItems}
            editorRequestId={quoteEditorRequestId}
            form={quoteForm}
            isCompactLayout={isCompactLayout}
            isSaving={isSaving}
            newQuoteClientIdRequest={quoteCreateClientRequestId}
            onAddCostItem={addQuoteItemFromCatalog}
            onDeleteItem={deleteQuoteItem}
            onDeleteQuotes={deleteQuotes}
            onDownloadPdf={downloadQuotePdf}
            onEditClient={openClientRecordFromAnotherView}
            onEditorRequestHandled={() => setQuoteEditorRequestId(null)}
            onFormChange={setQuoteForm}
            onNewQuoteClientRequestHandled={() => setQuoteCreateClientRequestId(null)}
            onSelectQuote={setSelectedQuoteId}
            onSubmit={handleQuoteSubmit}
            onTransition={transitionQuote}
            quotes={quotes}
            selectedQuoteId={selectedQuoteId}
          />
        ) : null}

        {activeView === 'treasury' ? (
          <TreasuryView
            clients={clients}
            expenseCategories={expenseCategories}
            expenseEntries={expenseEntries}
            expenseForm={expenseForm}
            isCompactLayout={isCompactLayout}
            isSaving={isSaving}
            onExpenseFormChange={setExpenseForm}
            onExpenseStatusChange={handleExpenseStatusChange}
            onExpenseSubmit={handleExpenseSubmit}
            onManageExpenseCategories={handleManageExpenseCategories}
            onDownloadPdf={downloadQuotePdf}
            onOpenQuote={openQuoteEditorFromAnotherView}
            onSendInvoiceByWhatsApp={sendInvoiceByWhatsApp}
            quotes={quotes}
          />
        ) : null}

        {activeView === 'company' ? (
          <CompanyProfileView
            form={companyProfileForm}
            isCompactLayout={isCompactLayout}
            isSaving={isSaving}
            legalChangeForm={tenantLegalChangeForm}
            mode={currentUser?.role === 'platform_admin' ? 'platform' : 'tenant'}
            onFormChange={setCompanyProfileForm}
            onLegalChangeFormChange={setTenantLegalChangeForm}
            onLegalChangeSubmit={handleTenantLegalChangeSubmit}
            onSubmit={handleCompanyProfileSubmit}
            requests={tenantChangeRequests}
          />
        ) : null}

        {activeView === 'platform' && currentUser?.role === 'platform_admin' ? (
          <PlatformAdminView
            activeSection={activePlatformSection}
            changeRequests={platformChangeRequests}
            isCompactLayout={isCompactLayout}
            isSaving={isSaving}
            memberships={platformMemberships}
            onChangeSection={setActivePlatformSection}
            onApproveFiscalChange={platformAdminHandlers.onApproveFiscalChange}
            onApproveSignup={platformAdminHandlers.onApproveSignup}
            onCancelMembershipPayment={platformAdminHandlers.onCancelMembershipPayment}
            onMarkMembershipPaid={platformAdminHandlers.onMarkMembershipPaid}
            onMarkSignupContacted={platformAdminHandlers.onMarkSignupContacted}
            onRejectFiscalChange={platformAdminHandlers.onRejectFiscalChange}
            onRejectSignup={platformAdminHandlers.onRejectSignup}
            onSendMembershipQuoteByEmail={platformAdminHandlers.onSendMembershipQuoteByEmail}
            onSendMembershipQuoteByWhatsApp={platformAdminHandlers.onSendMembershipQuoteByWhatsApp}
            onUpdateMembershipPayment={platformAdminHandlers.onUpdateMembershipPayment}
            signupRequests={platformSignupRequests}
          />
        ) : null}
      </section>
      {isCompactLayout ? (
        <DashboardBottomTabs activeView={activeView} items={bottomNavigationItems} onViewChange={goToView} />
      ) : null}
    </main>
  );
}

