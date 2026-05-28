import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Bell, Eye, FileText, MapPin, Phone, UserRound } from 'lucide-react';
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
import {
  bottomTabIcon,
  buildGreetingByBuenosAiresTime,
  buildInvoiceHtml,
  buildWhatsAppInvoiceMessage,
  companyProfileToForm,
  compactPayload,
  escapeHtml,
  navStyle,
  quoteTransitionSuccessMessage,
  showSuccessToast,
  themeVariables,
} from './dashboardUtils';
import {
  clientName,
  downloadBlob,
  formatDate,
  formatMoney,
  formatMonth,
  formatMonthsCovered,
  matchesSearch,
  nullable,
  openMailTo,
  openWhatsAppMessage,
  quoteTimestamp,
  sumExpenses,
  sumQuotes,
} from './helpers';
import { buildPlatformNotifications } from './platformNotifications';
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
import { Field, QuoteProgress, StatusBadge } from './ui';
import type {
  ClientForm,
  ClientRecordRequest,
  ClientRecordSection,
  ClientSection,
  CompanyProfileForm,
  CompanySection,
  CostForm,
  ExpenseFilter,
  ExpenseForm,
  MembershipFilter,
  PlatformNotification,
  PlatformSection,
  QuoteForm,
  QuoteSection,
  ServiceRecordForm,
  TenantLegalChangeForm,
  TreasuryMovementFilter,
  TreasurySection,
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

const NAV_SHORTCUTS: Record<View, string> = {
  clients: 'CL',
  company: 'EM',
  costs: 'SV',
  platform: 'PF',
  quotes: 'PR',
  summary: 'IN',
  treasury: 'TS',
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

  const metrics = [
    { label: 'Clientes', value: String(clients.length) },
    { label: 'Servicios activos', value: String(costItems.length) },
    { label: 'Presupuestos', value: String(quotes.length) },
    { label: 'Facturado', value: formatMoney(sumQuotes(quotes, 'accepted')) },
  ];

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

  const navigationItems: Array<{ label: string; view: View }> = [
    { label: 'Resumen', view: 'summary' },
    { label: 'Clientes', view: 'clients' },
    { label: 'Servicios', view: 'costs' },
    { label: 'Presupuestos', view: 'quotes' },
    { label: 'Tesoreria', view: 'treasury' },
  ];
  if (currentUser?.role === 'platform_admin') {
    navigationItems.push({ label: 'Plataforma', view: 'platform' });
  } else {
    navigationItems.push({ label: 'Empresa', view: 'company' });
  }
  const platformAccountActions =
    currentUser?.role === 'platform_admin'
      ? [{ label: 'Perfil', view: 'company' as View }]
      : [];
  const platformNotifications =
    currentUser?.role === 'platform_admin'
      ? buildPlatformNotifications(platformSignupRequests, platformChangeRequests, platformMemberships)
      : [];
  const pendingNotificationCount = platformNotifications.length;
  const signupNotifications = platformNotifications.filter((item) => item.kind === 'signup');
  const changeNotifications = platformNotifications.filter((item) => item.kind === 'change_request');
  const membershipNotifications = platformNotifications.filter((item) => item.kind === 'membership');
  const bottomNavigationItems = navigationItems.filter((item) =>
    ['summary', 'clients', 'quotes', 'treasury'].includes(item.view),
  );
  const mobileDrawerNavigationItems = navigationItems.filter((item) =>
    ['costs', 'company', 'platform'].includes(item.view),
  );
  const mobileDrawerAccountItems =
    currentUser?.role === 'platform_admin'
      ? [{ label: 'Perfil', view: 'company' as View }]
      : [];
  const shouldHideSidebarText = isSidebarCollapsed && !isCompactLayout;
  const currentViewLabel = navigationItems.find((item) => item.view === activeView)?.label ?? 'Resumen';
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
          <header style={styles.mobileHeader}>
            <div style={styles.mobileBrand}>
              <img alt="" src="/FacturEasy-icon.png" style={styles.mobileLogo} />
              <div style={styles.mobileBrandText}>
                <strong>FacturEasy</strong>
                <span style={styles.mobileCurrentView}>{currentViewLabel}</span>
              </div>
            </div>
            <div style={styles.mobileHeaderActions}>
              {currentUser?.role === 'platform_admin' ? (
                <button
                  aria-label="Notificaciones"
                  onClick={() => setIsNotificationsOpen((current) => !current)}
                  style={styles.notificationButton}
                  title="Notificaciones"
                  type="button"
                >
                  <Bell aria-hidden="true" size={16} strokeWidth={2.2} />
                  {pendingNotificationCount > 0 ? <span style={styles.notificationBadge}>{pendingNotificationCount}</span> : null}
                </button>
              ) : null}
            <button
              aria-label="Abrir menu"
              onClick={() => setIsMobileMenuOpen(true)}
              style={styles.hamburgerButton}
              type="button"
            >
              <span style={styles.hamburgerGlyph}>Menu</span>
            </button>
            </div>
          </header>
          {isMobileMenuOpen ? (
            <div onClick={() => setIsMobileMenuOpen(false)} style={styles.mobileDrawerOverlay}>
              <aside onClick={(event) => event.stopPropagation()} style={styles.mobileDrawer} aria-label="Menu movil">
                <div style={styles.mobileDrawerHeader}>
                  <strong>Mas opciones</strong>
                  <button
                    aria-label="Cerrar menu"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={styles.sidebarToggle}
                    type="button"
                  >
                    X
                  </button>
                </div>
                <nav style={styles.mobileDrawerNav}>
                  {mobileDrawerNavigationItems.map((item) => (
                    <button
                      key={item.view}
                      onClick={() => goToView(item.view)}
                      style={{ ...navStyle(activeView === item.view), ...styles.mobileDrawerNavButton }}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                  {mobileDrawerAccountItems.map((item) => (
                    <button
                      key={item.view}
                      onClick={() => goToView(item.view)}
                      style={{ ...navStyle(activeView === item.view), ...styles.mobileDrawerNavButton }}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>
                <div style={styles.mobileDrawerActions}>
                  <button onClick={toggleTheme} style={styles.secondaryButton} type="button">
                    {isDarkMode ? 'Modo claro' : 'Dark mode'}
                  </button>
                  <button onClick={onLogout} style={styles.secondaryButton} type="button">
                    Salir
                  </button>
                </div>
              </aside>
            </div>
          ) : null}
        </>
      ) : (
        <aside
          style={{
            ...styles.sidebar,
            ...(isSidebarCollapsed ? styles.sidebarCollapsed : null),
          }}
          aria-label="Navegacion principal"
        >
          <div style={{ ...styles.logoRow, ...(shouldHideSidebarText ? styles.logoRowCollapsed : null) }}>
            <img
              alt=""
              src="/FacturEasy-icon.png"
              style={{ ...styles.logoMark, ...(shouldHideSidebarText ? styles.logoMarkCollapsed : null) }}
            />
            {shouldHideSidebarText ? null : <strong style={styles.logoText}>FacturEasy</strong>}
            <button
              aria-label={isSidebarCollapsed ? 'Expandir menu' : 'Minimizar menu'}
              onClick={() => setIsSidebarCollapsed((current) => !current)}
              style={{ ...styles.sidebarToggle, ...(shouldHideSidebarText ? styles.sidebarToggleCollapsed : null) }}
              type="button"
            >
              {isSidebarCollapsed ? '>' : '<'}
            </button>
          </div>
          <nav style={styles.nav}>
            {navigationItems.map((item) => (
              <button
                key={item.view}
                onClick={() => goToView(item.view)}
                style={{
                  ...navStyle(activeView === item.view),
                  ...(shouldHideSidebarText ? styles.navItemCollapsed : null),
                }}
                aria-label={item.label}
                title={item.label}
                type="button"
              >
                <span
                  aria-hidden="true"
                  style={{
                    ...styles.navMonogram,
                    ...(activeView === item.view ? styles.navMonogramActive : null),
                    ...(shouldHideSidebarText ? styles.navMonogramCollapsed : null),
                  }}
                >
                  {NAV_SHORTCUTS[item.view]}
                </span>
                {shouldHideSidebarText ? null : <span style={styles.navLabel}>{item.label}</span>}
              </button>
            ))}
          </nav>
        </aside>
      )}

      <section style={{ ...styles.content, ...(isCompactLayout ? styles.contentCompact : null) }}>
        <header style={{ ...styles.topbar, ...(isCompactLayout ? styles.topbarMobileHidden : null) }}>
          <div>
            <h1 style={styles.title}>Panel operativo</h1>
            <p style={styles.subtitle}>Clientes, catalogo de servicios y facturacion aislados por empresa.</p>
          </div>
          <div style={styles.topbarActions}>
            {currentUser?.role === 'platform_admin' ? (
              <button
                aria-label="Notificaciones"
                onClick={() => setIsNotificationsOpen((current) => !current)}
                style={styles.notificationButton}
                title="Notificaciones"
                type="button"
              >
                <Bell aria-hidden="true" size={16} strokeWidth={2.2} />
                {pendingNotificationCount > 0 ? <span style={styles.notificationBadge}>{pendingNotificationCount}</span> : null}
              </button>
            ) : null}
            {platformAccountActions.map((item) => (
              <button
                key={item.view}
                onClick={() => goToView(item.view)}
                style={activeView === item.view ? styles.secondaryButtonActive : styles.secondaryButton}
                title={item.label}
                type="button"
              >
                <span style={styles.buttonWithIcon}>
                  <UserRound aria-hidden="true" size={15} strokeWidth={2.2} />
                  <span>{item.label}</span>
                </span>
              </button>
            ))}
            <button
              onClick={toggleTheme}
              style={styles.secondaryButton}
              type="button"
            >
              {isDarkMode ? 'Modo claro' : 'Dark mode'}
            </button>
            <button onClick={onLogout} style={styles.secondaryButton} type="button">
              Salir
            </button>
          </div>
        </header>

        {loadError ? <p style={styles.errorBanner}>{loadError}</p> : null}

        {isNotificationsOpen && currentUser?.role === 'platform_admin' ? (
          <aside style={styles.notificationPanel} aria-label="Panel de notificaciones">
            <div style={styles.panelHeaderCompact}>
              <h2 style={styles.panelTitle}>Pendientes de plataforma</h2>
              <button
                aria-label="Cerrar notificaciones"
                onClick={() => setIsNotificationsOpen(false)}
                style={styles.sidebarToggle}
                type="button"
              >
                X
              </button>
            </div>
            {signupNotifications.length > 0 ? (
              <section style={styles.notificationSection}>
                <strong>Altas pendientes</strong>
                {signupNotifications.map((item) => (
                  <article key={item.id} style={styles.notificationItem}>
                    <strong>{item.title}</strong>
                    <span style={styles.mutedText}>{item.description}</span>
                    <button onClick={() => openPlatformNotifications('signups')} style={styles.linkButton} type="button">
                      {item.actionLabel}
                    </button>
                  </article>
                ))}
              </section>
            ) : null}
            {changeNotifications.length > 0 ? (
              <section style={styles.notificationSection}>
                <strong>Cambios fiscales</strong>
                {changeNotifications.map((item) => (
                  <article key={item.id} style={styles.notificationItem}>
                    <strong>{item.title}</strong>
                    <span style={styles.mutedText}>{item.description}</span>
                    <button onClick={() => openPlatformNotifications('changes')} style={styles.linkButton} type="button">
                      {item.actionLabel}
                    </button>
                  </article>
                ))}
              </section>
            ) : null}
            {membershipNotifications.length > 0 ? (
              <section style={styles.notificationSection}>
                <strong>Membresias por vencer o vencidas</strong>
                {membershipNotifications.map((item) => (
                  <article key={item.id} style={styles.notificationItem}>
                    <strong>{item.title}</strong>
                    <span style={styles.mutedText}>{item.description}</span>
                    <button onClick={() => openPlatformNotifications('memberships')} style={styles.linkButton} type="button">
                      {item.actionLabel}
                    </button>
                  </article>
                ))}
              </section>
            ) : null}
            {pendingNotificationCount === 0 ? <p style={styles.compactEmpty}>No hay pendientes operativos.</p> : null}
          </aside>
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
            onMarkMembershipPaid={async (membership, payload) => {
              setIsSaving(true);
              try {
                const updated = await apiClient.markPlatformMembershipPaid(membership.id, payload);
                const [clientsResponse, quotesResponse] = await Promise.all([
                  apiClient.listClients(),
                  apiClient.listQuotes(),
                ]);
                setPlatformMemberships((current) =>
                  current.map((item) => (item.id === updated.id ? updated : item)),
                );
                setClients(clientsResponse.items);
                setQuotes(quotesResponse.items);
                const latestPayment = updated.payments[0] ?? null;
                if (latestPayment?.quote_id) {
                  setSelectedQuoteId(latestPayment.quote_id);
                }
                showSuccessToast(
                  latestPayment?.quote_number
                    ? `Pago registrado con presupuesto ${latestPayment.quote_number}`
                    : 'Pago registrado',
                );
              } finally {
                setIsSaving(false);
              }
            }}
            onUpdateMembershipPayment={async (membership, payment, payload) => {
              setIsSaving(true);
              try {
                const updated = await apiClient.updatePlatformMembershipPayment(membership.id, payment.id, payload);
                const quotesResponse = await apiClient.listQuotes();
                setPlatformMemberships((current) =>
                  current.map((item) => (item.id === updated.id ? updated : item)),
                );
                setQuotes(quotesResponse.items);
                const updatedPayment = updated.payments.find((item) => item.id === payment.id) ?? null;
                if (updatedPayment?.quote_id) {
                  setSelectedQuoteId(updatedPayment.quote_id);
                }
                showSuccessToast('Pago actualizado');
              } finally {
                setIsSaving(false);
              }
            }}
            onCancelMembershipPayment={async (membership, payment, payload) => {
              setIsSaving(true);
              try {
                const updated = await apiClient.cancelPlatformMembershipPayment(membership.id, payment.id, payload);
                setPlatformMemberships((current) =>
                  current.map((item) => (item.id === updated.id ? updated : item)),
                );
                showSuccessToast('Pago anulado');
              } finally {
                setIsSaving(false);
              }
            }}
            onApproveSignup={async (request, adminPassword) => {
              setIsSaving(true);
              try {
                const updated = await apiClient.approvePlatformSignupRequest(request.id, adminPassword);
                setPlatformSignupRequests((current) =>
                  current.map((item) => (item.id === updated.id ? updated : item)),
                );
                const memberships = await apiClient.listPlatformMemberships();
                setPlatformMemberships(memberships.items);
                showSuccessToast('Cuenta creada');
              } finally {
                setIsSaving(false);
              }
            }}
            onApproveFiscalChange={async (request) => {
              setIsSaving(true);
              try {
                const updated = await apiClient.approvePlatformChangeRequest(request.id);
                setPlatformChangeRequests((current) =>
                  current.map((item) => (item.id === updated.id ? updated : item)),
                );
                showSuccessToast('Cambio fiscal aprobado');
              } finally {
                setIsSaving(false);
              }
            }}
            onMarkSignupContacted={async (request) => {
              setIsSaving(true);
              try {
                const updated = await apiClient.markPlatformSignupRequestContacted(request.id);
                setPlatformSignupRequests((current) =>
                  current.map((item) => (item.id === updated.id ? updated : item)),
                );
                showSuccessToast('Alta marcada como contactada');
              } finally {
                setIsSaving(false);
              }
            }}
            onRejectFiscalChange={async (request) => {
              setIsSaving(true);
              try {
                const updated = await apiClient.rejectPlatformChangeRequest(request.id);
                setPlatformChangeRequests((current) =>
                  current.map((item) => (item.id === updated.id ? updated : item)),
                );
                showSuccessToast('Cambio fiscal rechazado');
              } finally {
                setIsSaving(false);
              }
            }}
            onRejectSignup={async (request) => {
              setIsSaving(true);
              try {
                const updated = await apiClient.rejectPlatformSignupRequest(request.id);
                setPlatformSignupRequests((current) =>
                  current.map((item) => (item.id === updated.id ? updated : item)),
                );
                showSuccessToast('Alta rechazada');
              } finally {
                setIsSaving(false);
              }
            }}
            onSendMembershipQuoteByEmail={async (payment) => {
              if (!payment.quote_id) {
                return;
              }

              const quote = quotes.find((item) => item.id === payment.quote_id);
              if (!quote) {
                await Swal.fire({
                  title: 'Presupuesto no disponible',
                  text: 'Recarga la pantalla para sincronizar el presupuesto generado.',
                  icon: 'info',
                  confirmButtonText: 'Cerrar',
                });
                return;
              }

              await sendQuoteByEmail(quote);
            }}
            onSendMembershipQuoteByWhatsApp={async (payment) => {
              if (!payment.quote_id) {
                return;
              }

              const quote = quotes.find((item) => item.id === payment.quote_id);
              if (!quote) {
                await Swal.fire({
                  title: 'Presupuesto no disponible',
                  text: 'Recarga la pantalla para sincronizar el presupuesto generado.',
                  icon: 'info',
                  confirmButtonText: 'Cerrar',
                });
                return;
              }

              await sendInvoiceByWhatsApp(quote);
            }}
            signupRequests={platformSignupRequests}
          />
        ) : null}
      </section>
      {isCompactLayout ? (
        <nav style={styles.bottomTabBar} aria-label="Accesos rapidos">
          {bottomNavigationItems.map((item) => (
            <button
              key={item.view}
              onClick={() => goToView(item.view)}
              style={activeView === item.view ? styles.bottomTabActive : styles.bottomTab}
              type="button"
            >
              <span>{bottomTabIcon(item.view)}</span>
              {item.label === 'Presupuestos' ? 'Presup.' : item.label}
            </button>
          ))}
        </nav>
      ) : null}
    </main>
  );
}

function buildMonthlyTreasuryRows(quotes: Quote[]): string[][] {
  const monthlyTotals = quotes.reduce<Record<string, { count: number; total: number }>>(
    (totals, quote) => {
      const date = new Date(quote.issued_at ?? quote.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const current = totals[key] ?? { count: 0, total: 0 };

      return {
        ...totals,
        [key]: {
          count: current.count + 1,
          total: current.total + Number(quote.total),
        },
      };
    },
    {},
  );

  return Object.entries(monthlyTotals)
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([month, value]) => [formatMonth(month), String(value.count), formatMoney(value.total)]);
}

function buildSmartTreasury(acceptedQuotes: Quote[], allQuotes: Quote[], expenses: ExpenseEntry[]) {
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
  const membershipsByMonth = Object.entries(monthlyCounts)
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
    acceptedByMonth: membershipsByMonth,
    months,
  };
}

function countByStatus<T extends { status: string }>(items: T[]) {
  return items.reduce<Record<string, number>>((totals, item) => {
    totals[item.status] = (totals[item.status] ?? 0) + 1;
    return totals;
  }, {});
}


function daysUntilDate(dateValue: string, now = new Date()): number {
  const target = new Date(`${dateValue}T00:00:00`);
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((target.getTime() - current.getTime()) / 86400000);
}


