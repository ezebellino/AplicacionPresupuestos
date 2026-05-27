import { FormEvent, useEffect, useRef, useState } from 'react';
import { Bell, Clock3, Eye, FileText, History, Mail, MapPin, MessageCircle, Pencil, Phone, Trash2, UserRound } from 'lucide-react';
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

type DashboardPageProps = {
  onLogout: () => void;
};

type View = 'summary' | 'clients' | 'costs' | 'quotes' | 'treasury' | 'company' | 'platform';
type PlatformSection = 'overview' | 'signups' | 'changes' | 'memberships';
type CompanySection = 'data' | 'billing' | 'preview';
type QuoteSection = 'list' | 'editor';
type ClientSection = 'list' | 'record';
type ClientRecordSection = 'data' | 'services' | 'quotes';
type TreasurySection = 'overview' | 'movements' | 'pending';
type TreasuryMovementFilter = 'all' | 'accepted' | 'issued' | 'rejected';
type ClientRecordRequest = {
  clientId: string;
  section: ClientRecordSection;
};
type MembershipFilter = 'all' | 'expired' | 'due_soon' | 'active';

type PlatformNotification =
  | {
      id: string;
      kind: 'signup';
      title: string;
      description: string;
      actionLabel: 'Revisar solicitud';
    }
  | {
      id: string;
      kind: 'change_request';
      title: string;
      description: string;
      actionLabel: 'Ver cambio';
    }
  | {
      id: string;
      kind: 'membership';
      title: string;
      description: string;
      actionLabel: 'Registrar pago';
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

type ClientForm = {
  name: string;
  document: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
};

type ServiceRecordForm = {
  performed_at: string;
  title: string;
  description: string;
  amount: string;
};

type CompanyProfileForm = {
  name: string;
  legal_name: string;
  tax_id: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string;
  invoice_notes: string;
  default_tax_rate: string;
};

type TenantLegalChangeForm = {
  proposed_name: string;
  proposed_legal_name: string;
  proposed_tax_id: string;
  reason: string;
};

type CostForm = {
  category: CostCategory;
  name: string;
  description: string;
  unit: string;
  unit_cost: string;
  tax_rate: string;
};

type QuoteForm = {
  client_id: string;
  title: string;
  notes: string;
  valid_until: string;
};

const emptyClientForm: ClientForm = {
  name: '',
  document: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
};

const emptyServiceRecordForm: ServiceRecordForm = {
  performed_at: new Date().toISOString().slice(0, 10),
  title: '',
  description: '',
  amount: '',
};

const emptyCompanyProfileForm: CompanyProfileForm = {
  name: '',
  legal_name: '',
  tax_id: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  logo_url: '',
  invoice_notes: '',
  default_tax_rate: '21.00',
};

const emptyTenantLegalChangeForm: TenantLegalChangeForm = {
  proposed_name: '',
  proposed_legal_name: '',
  proposed_tax_id: '',
  reason: '',
};

const emptyCostForm: CostForm = {
  category: 'services',
  name: '',
  description: '',
  unit: 'servicio',
  unit_cost: '',
  tax_rate: '',
};

const emptyQuoteForm: QuoteForm = {
  client_id: '',
  title: '',
  notes: '',
  valid_until: '',
};

const categoryLabels: Record<CostCategory, string> = {
  equipment: 'Equipos',
  materials: 'Materiales',
  labor: 'Mano de obra',
  services: 'Servicios',
};

const statusLabels: Record<QuoteStatus, string> = {
  draft: 'Borrador',
  issued: 'Emitido',
  accepted: 'Aceptado',
  rejected: 'Rechazado',
};

const serviceOperationPresets = [
  'Instalación',
  'Mantenimiento',
  'Carga de Gas',
  'Reparación',
  'Mano de Obra',
  'Desinstalación',
];

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
      const [userResponse, profileResponse, changeRequestsResponse, clientsResponse, costsResponse, quotesResponse] = await Promise.all([
        apiClient.getCurrentUser(),
        apiClient.getTenantProfile(),
        apiClient.listTenantChangeRequests(),
        apiClient.listClients(),
        apiClient.listCostItems(),
        apiClient.listQuotes(),
      ]);
      setCurrentUser(userResponse);
      setCompanyProfile(profileResponse);
      setCompanyProfileForm(companyProfileToForm(profileResponse));
      setTenantChangeRequests(changeRequestsResponse.items);
      setClients(clientsResponse.items);
      setCostItems(costsResponse.items);
      setQuotes(quotesResponse.items);
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
            isCompactLayout={isCompactLayout}
            isLoading={isLoading}
            metrics={metrics}
            onNewQuote={() => setActiveView('quotes')}
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
            isCompactLayout={isCompactLayout}
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

function SummaryView({
  clients,
  costItems,
  isCompactLayout,
  isLoading,
  metrics,
  onNewQuote,
  quotes,
}: {
  clients: Client[];
  costItems: CostItem[];
  isCompactLayout: boolean;
  isLoading: boolean;
  metrics: { label: string; value: string }[];
  onNewQuote: () => void;
  quotes: Quote[];
}) {
  const recentQuotes = quotes.slice(0, 5);

  return (
    <>
      <section style={styles.metrics} aria-label="Indicadores">
        {metrics.map((metric) => (
          <article key={metric.label} style={styles.metricCard}>
            <p style={styles.metricLabel}>{metric.label}</p>
            <strong style={styles.metricValue}>{isLoading ? '...' : metric.value}</strong>
          </article>
        ))}
      </section>

      <section style={styles.gridTwo}>
        <section style={styles.tablePanel} aria-labelledby="services-summary-title">
          <div style={styles.panelHeader}>
            <h2 id="services-summary-title" style={styles.panelTitle}>
              Items de cobro
            </h2>
          </div>
          {costItems.length === 0 ? (
            <p style={styles.emptyState}>Todavia no hay servicios cargados.</p>
          ) : (
            <div style={styles.categoryGrid}>
              {costItems.slice(0, 5).map((item) => (
                <div key={item.id} style={styles.categoryRow}>
                  <span>{item.name}</span>
                  <strong>{formatMoney(item.unit_cost)}</strong>
                </div>
              ))}
              {costItems.length > 5 ? (
                <div style={styles.categoryRow}>
                  <span>Otros servicios</span>
                  <strong>{costItems.length - 5}</strong>
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section style={styles.tablePanel} aria-labelledby="recent-quotes-title">
          <div style={styles.panelHeader}>
            <h2 id="recent-quotes-title" style={styles.panelTitle}>
              Presupuestos recientes
            </h2>
            <button onClick={onNewQuote} style={styles.primaryButton} type="button">
              Nuevo
            </button>
          </div>
          {recentQuotes.length === 0 ? (
            <p style={styles.emptyState}>Todavia no hay presupuestos cargados.</p>
          ) : (
            <DataTable
              headers={['Cliente', 'Presupuesto', 'Estado', 'Total']}
              isCompactLayout={isCompactLayout}
              rows={recentQuotes.map((quote) => [
                clientName(clients, quote.client_id),
                quote.number,
                statusLabels[quote.status],
                formatMoney(quote.total),
              ])}
            />
          )}
        </section>
      </section>
    </>
  );
}

function ClientsView({
  clients,
  editingClientId,
  form,
  isCompactLayout,
  isSaving,
  recordRequest,
  quotes,
  selectedClientId,
  serviceRecordForm,
  serviceRecords,
  onCancel,
  onCreateQuoteForClient,
  onDelete,
  onEdit,
  onHistory,
  onOpenQuote,
  onQuickCreate,
  onRecordRequestHandled,
  onFormChange,
  onServiceFormChange,
  onServiceSubmit,
  onSubmit,
}: {
  clients: Client[];
  editingClientId: string | null;
  form: ClientForm;
  isCompactLayout: boolean;
  isSaving: boolean;
  recordRequest: ClientRecordRequest | null;
  quotes: Quote[];
  selectedClientId: string | null;
  serviceRecordForm: ServiceRecordForm;
  serviceRecords: ClientServiceRecord[];
  onCancel: () => void;
  onCreateQuoteForClient: (clientId: string) => void;
  onDelete: (client: Client) => void;
  onEdit: (client: Client) => void;
  onHistory: (client: Client) => Promise<void>;
  onOpenQuote: (quoteId: string) => void;
  onQuickCreate: (payload: Pick<ClientPayload, 'name' | 'phone' | 'address'>) => Promise<Client | null>;
  onRecordRequestHandled: () => void;
  onFormChange: (form: ClientForm) => void;
  onServiceFormChange: (form: ServiceRecordForm) => void;
  onServiceSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [activeSection, setActiveSection] = useState<ClientSection>('list');
  const [activeRecordSection, setActiveRecordSection] = useState<ClientRecordSection>('data');
  const [search, setSearch] = useState('');
  const clientSections = [
    { id: 'list' as const, label: 'Listado' },
    { id: 'record' as const, label: 'Ficha' },
  ];
  const recordSections = [
    { id: 'data' as const, label: 'Datos' },
    { id: 'services' as const, label: 'Servicios' },
    { id: 'quotes' as const, label: 'Presupuestos' },
  ];
  const filteredClients = clients.filter((client) =>
    matchesSearch(
      [client.name, client.document, client.email, client.phone, client.address],
      search,
    ),
  );
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;
  const selectedClientQuotes = selectedClient
    ? quotes
        .filter((quote) => quote.client_id === selectedClient.id)
        .sort((left, right) => quoteTimestamp(right) - quoteTimestamp(left))
    : [];
  const quotesByClientId = quotes.reduce<Record<string, number>>((accumulator, quote) => {
    accumulator[quote.client_id] = (accumulator[quote.client_id] ?? 0) + 1;
    return accumulator;
  }, {});
  const latestSelectedClientQuote = selectedClientQuotes[0] ?? null;
  useEffect(() => {
    if (!recordRequest || recordRequest.clientId !== selectedClientId) {
      return;
    }

    setActiveRecordSection(recordRequest.section);
    setActiveSection('record');
    onRecordRequestHandled();
  }, [onRecordRequestHandled, recordRequest, selectedClientId]);

  const openClientRecord = async (client: Client, section: ClientRecordSection = 'data') => {
    setActiveRecordSection(section);
    setActiveSection('record');
    await onHistory(client);
  };
  const handleQuickCreate = async () => {
    const result = await Swal.fire({
      title: 'Nuevo cliente',
      html: `
        <p style="margin:0 0 14px;text-align:left;color:#64748b;font-size:13px;">
          Carga lo minimo para empezar y completa el resto despues desde la ficha.
        </p>
        <label style="display:grid;gap:6px;text-align:left;margin-bottom:12px;">
          <span>Nombre</span>
          <input id="client-name" class="swal2-input" placeholder="Ej. Juan Perez" style="margin:0;" />
        </label>
        <label style="display:grid;gap:6px;text-align:left;margin-bottom:12px;">
          <span>Telefono</span>
          <input id="client-phone" class="swal2-input" placeholder="Ej. 2245 476329" style="margin:0;" />
        </label>
        <label style="display:grid;gap:6px;text-align:left;">
          <span>Direccion</span>
          <input id="client-address" class="swal2-input" placeholder="Ej. Ameghino 655" style="margin:0;" />
        </label>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Crear cliente',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const nameValue = (document.getElementById('client-name') as HTMLInputElement | null)?.value.trim() ?? '';
        const phoneValue = (document.getElementById('client-phone') as HTMLInputElement | null)?.value.trim() ?? '';
        const addressValue =
          (document.getElementById('client-address') as HTMLInputElement | null)?.value.trim() ?? '';

        if (!nameValue || !phoneValue || !addressValue) {
          Swal.showValidationMessage('Completa nombre, telefono y direccion.');
          return undefined;
        }

        return {
          address: addressValue,
          name: nameValue,
          phone: phoneValue,
        };
      },
    });

    if (!result.isConfirmed || !result.value) {
      return;
    }

    const createdClient = await onQuickCreate(result.value);
    if (!createdClient) {
      return;
    }

    setActiveRecordSection('data');
    setActiveSection('record');
  };

  return (
    <section style={styles.companyWorkspace}>
      <div style={styles.companyWorkspaceHeader}>
        <div>
          <h2 style={styles.panelTitle}>Clientes</h2>
          <p style={styles.panelSubtitle}>Alta rapida, seguimiento y relacion completa de cada cliente en una sola ficha.</p>
        </div>
        <div style={styles.actions}>
          <button disabled={isSaving} onClick={() => void handleQuickCreate()} style={styles.primaryButton} type="button">
            Nuevo cliente
          </button>
          {isCompactLayout ? (
            <label style={styles.platformSelectField}>
              <span style={styles.labelCaption}>Seccion de clientes</span>
              <select
                aria-label="Seccion de clientes"
                onChange={(event) => setActiveSection(event.target.value as ClientSection)}
                style={styles.select}
                value={activeSection}
              >
                {clientSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div style={styles.platformSectionNav} role="tablist" aria-label="Navegacion de clientes">
              {clientSections.map((section) => (
                <button
                  aria-pressed={activeSection === section.id}
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  style={activeSection === section.id ? styles.platformSectionButtonActive : styles.platformSectionButton}
                  type="button"
                >
                  {section.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeSection === 'list' ? (
        <section style={styles.tablePanel} aria-labelledby="clients-title">
          <div style={styles.panelHeader}>
            <div>
              <h2 id="clients-title" style={styles.panelTitle}>
                Listado
              </h2>
              <p style={styles.panelSubtitle}>Busca rapido, abre la ficha y manten a mano las acciones mas usadas.</p>
            </div>
          </div>
          <div style={styles.filterBar}>
            <label style={styles.compactLabel}>
              Buscar
              <input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre, documento o contacto"
                style={styles.searchInput}
                value={search}
              />
            </label>
          </div>
          {clients.length === 0 ? (
            <p style={styles.emptyState}>Todavia no hay clientes cargados.</p>
          ) : filteredClients.length === 0 ? (
            <p style={styles.emptyState}>No hay clientes que coincidan con la busqueda.</p>
          ) : (
            <div style={styles.clientList}>
              {filteredClients.map((client) => (
                <article key={client.id} style={styles.clientRow}>
                  <button
                    onClick={() => void openClientRecord(client, 'data')}
                    style={styles.clientRowButton}
                    type="button"
                  >
                    <div style={styles.clientIdentity}>
                      <strong>{client.name}</strong>
                      <span style={styles.mutedText}>{client.document || 'Sin documento cargado'}</span>
                    </div>
                    <div style={styles.clientContact}>
                      <span style={styles.clientContactLine}>
                        <Phone aria-hidden="true" size={14} strokeWidth={2} />
                        {client.phone || 'Sin telefono'}
                      </span>
                      <span style={styles.clientContactLineMuted}>
                        <MapPin aria-hidden="true" size={14} strokeWidth={2} />
                        {client.address || client.email || 'Sin direccion cargada'}
                      </span>
                    </div>
                    <div style={styles.clientMetaStack}>
                      <span style={styles.clientMetaPill}>{quotesByClientId[client.id] ?? 0} presup.</span>
                      {client.email ? <span style={styles.mutedText}>{client.email}</span> : null}
                    </div>
                  </button>
                  <div style={styles.clientActions}>
                    <button
                      aria-label="Editar"
                      onClick={() => {
                        void openClientRecord(client, 'data');
                        onEdit(client);
                      }}
                      style={styles.iconActionButton}
                      title="Editar"
                      type="button"
                    >
                      <Pencil aria-hidden="true" size={15} strokeWidth={2.2} />
                    </button>
                    <button
                      aria-label="Historial"
                      onClick={() => void openClientRecord(client, 'services')}
                      style={styles.iconActionButton}
                      title="Historial"
                      type="button"
                    >
                      <History aria-hidden="true" size={15} strokeWidth={2.2} />
                    </button>
                    <button
                      aria-label="Eliminar"
                      onClick={() => onDelete(client)}
                      style={styles.iconDangerButton}
                      title="Eliminar"
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={15} strokeWidth={2.2} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeSection === 'record' ? (
        <section style={styles.tablePanel} aria-labelledby="client-record-title">
          <div style={styles.panelHeader}>
            <div>
              <h2 id="client-record-title" style={styles.panelTitle}>
                {selectedClient ? `Ficha de ${selectedClient.name}` : 'Ficha del cliente'}
              </h2>
              <p style={styles.panelSubtitle}>
                {selectedClient
                  ? 'Consulta datos, servicios y presupuestos del cliente seleccionado.'
                  : 'Selecciona un cliente desde el listado o crea uno nuevo para continuar.'}
              </p>
            </div>
          </div>
          {!selectedClient ? (
            <p style={styles.emptyState}>Selecciona un cliente desde el listado para abrir su ficha.</p>
          ) : (
            <div style={styles.clientRecordShell}>
              {isCompactLayout ? (
                <label style={styles.platformSelectField}>
                  <span style={styles.labelCaption}>Seccion de ficha</span>
                  <select
                    aria-label="Seccion de ficha"
                    onChange={(event) => setActiveRecordSection(event.target.value as ClientRecordSection)}
                    style={styles.select}
                    value={activeRecordSection}
                  >
                    {recordSections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div style={styles.platformSectionNav} role="tablist" aria-label="Navegacion de ficha del cliente">
                  {recordSections.map((section) => (
                    <button
                      aria-pressed={activeRecordSection === section.id}
                      key={section.id}
                      onClick={() => setActiveRecordSection(section.id)}
                      style={
                        activeRecordSection === section.id
                          ? styles.platformSectionButtonActive
                          : styles.platformSectionButton
                      }
                      type="button"
                    >
                      {section.label}
                    </button>
                  ))}
                </div>
              )}

              {activeRecordSection === 'data' ? (
                editingClientId === selectedClient.id ? (
                  <form onSubmit={onSubmit} style={styles.formPanel}>
                    <h3 style={styles.compactTitle}>Editar cliente</h3>
                    <Field label="Nombre" required value={form.name} onChange={(name) => onFormChange({ ...form, name })} />
                    <Field label="CUIT/DNI" value={form.document} onChange={(document) => onFormChange({ ...form, document })} />
                    <Field label="Email" type="email" value={form.email} onChange={(email) => onFormChange({ ...form, email })} />
                    <Field label="Telefono" required value={form.phone} onChange={(phone) => onFormChange({ ...form, phone })} />
                    <Field label="Direccion" required value={form.address} onChange={(address) => onFormChange({ ...form, address })} />
                    <label style={styles.label}>
                      Notas
                      <textarea
                        onChange={(event) => onFormChange({ ...form, notes: event.target.value })}
                        rows={3}
                        style={styles.textarea}
                        value={form.notes}
                      />
                    </label>
                    <div style={styles.actions}>
                      <button disabled={isSaving} style={styles.primaryButton} type="submit">
                        Guardar cambios
                      </button>
                      <button onClick={onCancel} style={styles.secondaryButton} type="button">
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <section style={styles.quoteEditorSection}>
                    <article style={styles.quoteEditorBlock}>
                      <div style={styles.panelHeaderCompact}>
                        <div>
                          <h3 style={styles.compactTitle}>Datos</h3>
                          <p style={styles.helperText}>Identidad, contacto y contexto operativo del cliente seleccionado.</p>
                        </div>
                        <div style={styles.actions}>
                          <button onClick={() => onCreateQuoteForClient(selectedClient.id)} style={styles.primaryButton} type="button">
                            Nuevo presupuesto
                          </button>
                          <button onClick={() => onEdit(selectedClient)} style={styles.secondaryButton} type="button">
                            Editar cliente
                          </button>
                        </div>
                      </div>
                      <div style={styles.clientOverviewBar}>
                        <span style={styles.clientMetaPill}>Presupuestos: {selectedClientQuotes.length}</span>
                        <span style={styles.clientMetaPill}>Servicios: {serviceRecords.length}</span>
                        <span style={styles.clientMetaPill}>
                          Ult. mov.: {latestSelectedClientQuote ? formatDate(latestSelectedClientQuote.issued_at ?? latestSelectedClientQuote.created_at) : 'Sin actividad'}
                        </span>
                      </div>
                      <div style={styles.quoteSummaryGrid}>
                        <div style={styles.quoteSummaryCard}>
                          <span style={styles.quoteSummaryLabel}>Nombre</span>
                          <strong>{selectedClient.name}</strong>
                        </div>
                        <div style={styles.quoteSummaryCard}>
                          <span style={styles.quoteSummaryLabel}>Telefono</span>
                          <strong>{selectedClient.phone || 'Sin telefono'}</strong>
                        </div>
                        <div style={styles.quoteSummaryCard}>
                          <span style={styles.quoteSummaryLabel}>Direccion</span>
                          <strong>{selectedClient.address || 'Sin direccion'}</strong>
                        </div>
                        <div style={styles.quoteSummaryCard}>
                          <span style={styles.quoteSummaryLabel}>Email</span>
                          <strong>{selectedClient.email || 'Sin email'}</strong>
                        </div>
                        <div style={styles.quoteSummaryCard}>
                          <span style={styles.quoteSummaryLabel}>Documento</span>
                          <strong>{selectedClient.document || 'Sin documento'}</strong>
                        </div>
                        <div style={styles.quoteSummaryCard}>
                          <span style={styles.quoteSummaryLabel}>Notas</span>
                          <strong>{selectedClient.notes || 'Sin notas operativas'}</strong>
                        </div>
                      </div>
                    </article>
                  </section>
                )
              ) : null}

              {activeRecordSection === 'services' ? (
                <section style={styles.quoteEditorSection}>
                  <article style={styles.quoteEditorBlock}>
                    <div>
                      <h3 style={styles.compactTitle}>Servicios realizados</h3>
                      <p style={styles.helperText}>Registro cronologico para trabajos ya ejecutados o novedades operativas.</p>
                    </div>
                    <form onSubmit={onServiceSubmit} style={styles.serviceForm}>
                      <Field
                        label="Fecha"
                        required
                        type="date"
                        value={serviceRecordForm.performed_at}
                        onChange={(performedAt) => onServiceFormChange({ ...serviceRecordForm, performed_at: performedAt })}
                      />
                      <Field
                        label="Servicio"
                        required
                        value={serviceRecordForm.title}
                        onChange={(title) => onServiceFormChange({ ...serviceRecordForm, title })}
                      />
                      <Field
                        label="Importe"
                        min="0"
                        step="0.01"
                        type="number"
                        value={serviceRecordForm.amount}
                        onChange={(amount) => onServiceFormChange({ ...serviceRecordForm, amount })}
                      />
                      <label style={styles.label}>
                        Detalle
                        <textarea
                          onChange={(event) => onServiceFormChange({ ...serviceRecordForm, description: event.target.value })}
                          rows={3}
                          style={styles.textarea}
                          value={serviceRecordForm.description}
                        />
                      </label>
                      <button disabled={isSaving} style={styles.primaryButton} type="submit">
                        Agregar servicio
                      </button>
                    </form>
                    {serviceRecords.length === 0 ? (
                      <p style={styles.compactEmpty}>Todavia no hay servicios registrados.</p>
                    ) : (
                      <div style={styles.serviceList}>
                        {serviceRecords.map((record) => (
                          <article key={record.id} style={styles.serviceRecord}>
                            <div style={styles.historyRecordHeader}>
                              <div>
                                <strong>{record.title}</strong>
                                <p style={styles.panelSubtitle}>{formatDate(record.performed_at)}</p>
                              </div>
                              {record.amount ? <strong>{formatMoney(record.amount)}</strong> : null}
                            </div>
                            {record.description ? <p style={styles.serviceDescription}>{record.description}</p> : null}
                          </article>
                        ))}
                      </div>
                    )}
                  </article>
                </section>
              ) : null}

              {activeRecordSection === 'quotes' ? (
                <section style={styles.quoteEditorSection}>
                  <article style={styles.quoteEditorBlock}>
                    <div>
                      <h3 style={styles.compactTitle}>Presupuestos</h3>
                      <p style={styles.helperText}>Historial completo de presupuestos emitidos para este cliente.</p>
                    </div>
                    {selectedClientQuotes.length === 0 ? (
                      <p style={styles.compactEmpty}>Todavia no hay presupuestos para este cliente.</p>
                    ) : (
                      <div style={styles.serviceList}>
                        {selectedClientQuotes.map((quote) => (
                          <article key={quote.id} style={styles.historyQuoteRecord}>
                            <div style={styles.historyRecordHeader}>
                              <div>
                                <strong>{quote.title || quote.number}</strong>
                                <p style={styles.panelSubtitle}>
                                  {quote.number} - {formatDate(quote.issued_at ?? quote.created_at)}
                                </p>
                              </div>
                              <StatusBadge status={quote.status} />
                            </div>
                            {quote.items.length > 0 ? (
                              <p style={styles.serviceDescription}>{quote.items.map((item) => item.name).join(', ')}</p>
                            ) : (
                              <p style={styles.serviceDescription}>Presupuesto sin items cargados.</p>
                            )}
                            <div style={styles.panelHeaderCompact}>
                              <strong>{formatMoney(quote.total)}</strong>
                              <button
                                aria-label="Abrir presupuesto"
                                onClick={() => onOpenQuote(quote.id)}
                                style={styles.iconActionButton}
                                title="Abrir presupuesto"
                                type="button"
                              >
                                <FileText aria-hidden="true" size={15} strokeWidth={2.2} />
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </article>
                </section>
              ) : null}
            </div>
          )}
        </section>
      ) : null}
    </section>
  );
}

function CostsView({
  costItems,
  editingCostId,
  form,
  isSaving,
  onCancel,
  onDelete,
  onEdit,
  onFormChange,
  onSubmit,
  showOperationPresets,
}: {
  costItems: CostItem[];
  editingCostId: string | null;
  form: CostForm;
  isSaving: boolean;
  onCancel: () => void;
  onDelete: (item: CostItem) => void;
  onEdit: (item: CostItem) => void;
  onFormChange: (form: CostForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  showOperationPresets: boolean;
}) {
  const [search, setSearch] = useState('');
  const filteredCostItems = costItems.filter((item) => {
    return matchesSearch([item.name, item.description], search);
  });

  return (
    <section style={styles.workspaceGrid}>
      <form onSubmit={onSubmit} style={styles.formPanel}>
        <div>
          <h2 style={styles.panelTitle}>{editingCostId ? 'Editar servicio' : 'Nuevo servicio'}</h2>
          <p style={styles.panelSubtitle}>
            Catalogo de operaciones que se cobran en cada presupuesto.
          </p>
        </div>
        {showOperationPresets ? (
          <div style={styles.presetGrid} aria-label="Operaciones frecuentes">
            {serviceOperationPresets.map((operation) => (
              <button
                key={operation}
                onClick={() => onFormChange({ ...form, category: 'services', name: operation })}
                style={form.name === operation ? styles.filterChipActive : styles.filterChip}
                type="button"
              >
                {operation}
              </button>
            ))}
          </div>
        ) : null}
        <Field label="Operacion" required value={form.name} onChange={(name) => onFormChange({ ...form, category: 'services', name })} />
        <Field
          label="Importe"
          min="0"
          required
          step="0.01"
          type="number"
          value={form.unit_cost}
          onChange={(unitCost) => onFormChange({ ...form, unit_cost: unitCost })}
        />
        <Field
          label="IVA item"
          max="100"
          min="0"
          placeholder="Vacio usa IVA general"
          step="0.01"
          type="number"
          value={form.tax_rate}
          onChange={(taxRate) => onFormChange({ ...form, tax_rate: taxRate })}
        />
        <label style={styles.label}>
          Descripcion
          <textarea
            onChange={(event) => onFormChange({ ...form, description: event.target.value })}
            rows={3}
            style={styles.textarea}
            value={form.description}
          />
        </label>
        <div style={styles.actions}>
          <button disabled={isSaving} style={styles.primaryButton} type="submit">
            {editingCostId ? 'Guardar cambios' : 'Crear servicio'}
          </button>
          {editingCostId ? (
            <button onClick={onCancel} style={styles.secondaryButton} type="button">
              Cancelar
            </button>
          ) : null}
        </div>
      </form>

      <section style={styles.tablePanel} aria-labelledby="costs-title">
        <div style={styles.panelHeader}>
          <h2 id="costs-title" style={styles.panelTitle}>
            Catalogo de servicios
          </h2>
        </div>
        <div style={styles.filterBar}>
          <label style={styles.compactLabel}>
            Buscar
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Instalación, mantenimiento o desinstalación"
              style={styles.searchInput}
              value={search}
            />
          </label>
        </div>
        {costItems.length === 0 ? (
          <p style={styles.emptyState}>Todavia no hay servicios cargados.</p>
        ) : filteredCostItems.length === 0 ? (
          <p style={styles.emptyState}>No hay servicios para esa busqueda.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Operacion</th>
                <th style={styles.thRight}>Costo</th>
                <th style={styles.thRight}>IVA</th>
                <th style={styles.thRight}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCostItems.map((item) => (
                <tr key={item.id}>
                  <td style={styles.td}>{item.name}</td>
                  <td style={styles.tdRight}>{formatMoney(item.unit_cost)}</td>
                  <td style={styles.tdRight}>
                    {item.tax_rate ? `${item.tax_rate}%` : `${item.effective_tax_rate}% general`}
                  </td>
                  <td style={styles.tdRight}>
                    <button onClick={() => onEdit(item)} style={styles.linkButton} type="button">
                      Editar
                    </button>
                    <button onClick={() => onDelete(item)} style={styles.dangerButton} type="button">
                      Desactivar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
}

function QuotesView({
  clients,
  costItems,
  editorRequestId,
  form,
  isCompactLayout,
  isSaving,
  newQuoteClientIdRequest,
  onAddCostItem,
  onDeleteItem,
  onDownloadPdf,
  onEditClient,
  onEditorRequestHandled,
  onFormChange,
  onNewQuoteClientRequestHandled,
  onSelectQuote,
  onSubmit,
  onTransition,
  quotes,
  selectedQuoteId,
}: {
  clients: Client[];
  costItems: CostItem[];
  editorRequestId: string | null;
  form: QuoteForm;
  isCompactLayout: boolean;
  isSaving: boolean;
  newQuoteClientIdRequest: string | null;
  onAddCostItem: (quote: Quote, item: CostItem) => void;
  onDeleteItem: (quote: Quote, itemId: string) => void;
  onDownloadPdf: (quote: Quote) => void;
  onEditClient: (clientId: string, section?: ClientRecordSection) => Promise<void>;
  onEditorRequestHandled: () => void;
  onFormChange: (form: QuoteForm) => void;
  onNewQuoteClientRequestHandled: () => void;
  onSelectQuote: (quoteId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => boolean | Promise<boolean>;
  onTransition: (quote: Quote, action: 'issue' | 'accept' | 'reject') => void;
  quotes: Quote[];
  selectedQuoteId: string | null;
}) {
  const [activeSection, setActiveSection] = useState<QuoteSection>('list');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');
  const [catalogSearch, setCatalogSearch] = useState('');
  useEffect(() => {
    if (!newQuoteClientIdRequest) {
      return;
    }

    onFormChange({ ...emptyQuoteForm, client_id: newQuoteClientIdRequest });
    setIsCreatingNew(true);
    setActiveSection('editor');
    onNewQuoteClientRequestHandled();
  }, [newQuoteClientIdRequest, onFormChange, onNewQuoteClientRequestHandled]);

  useEffect(() => {
    if (!editorRequestId || selectedQuoteId !== editorRequestId) {
      return;
    }

    setIsCreatingNew(false);
    setActiveSection('editor');
    onEditorRequestHandled();
  }, [editorRequestId, onEditorRequestHandled, selectedQuoteId]);

  const filteredQuotes = [...quotes]
    .sort((left, right) => quoteTimestamp(right) - quoteTimestamp(left))
    .filter((quote) => {
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;

    return (
      matchesStatus &&
      matchesSearch(
        [
          quote.number,
          quote.title,
          quote.notes,
          statusLabels[quote.status],
          clientName(clients, quote.client_id),
        ],
        search,
      )
    );
    });
  const selectedQuote = quotes.find((quote) => quote.id === selectedQuoteId) ?? null;
  const canEditSelected = selectedQuote?.status === 'draft';
  const filteredCatalogItems = costItems.filter((item) =>
    matchesSearch([item.name, item.description], catalogSearch),
  );
  const quoteSections: Array<{ id: QuoteSection; label: string }> = [
    { id: 'list', label: `Listado (${filteredQuotes.length})` },
    { id: 'editor', label: 'Editor' },
  ];
  const handleCreateQuote = async (event: FormEvent<HTMLFormElement>) => {
    const wasCreated = await onSubmit(event);

    if (wasCreated) {
      setIsCreatingNew(false);
      setActiveSection('editor');
    }
  };
  const openNewQuoteEditor = () => {
    onFormChange(emptyQuoteForm);
    setIsCreatingNew(true);
    setActiveSection('editor');
  };
  const openExistingQuote = (quoteId: string) => {
    setIsCreatingNew(false);
    onSelectQuote(quoteId);
    setActiveSection('editor');
  };

  return (
    <section style={styles.companyWorkspace}>
      <div style={styles.companyWorkspaceHeader}>
        <div>
          <h2 style={styles.panelTitle}>Presupuestos</h2>
          <p style={styles.panelSubtitle}>Gestiona borradores, emisiones y seguimiento desde un flujo mas claro.</p>
        </div>
        <div style={styles.actions}>
          <button onClick={openNewQuoteEditor} style={styles.primaryButton} type="button">
            Nuevo presupuesto
          </button>
          {isCompactLayout ? (
            <label style={styles.platformSelectField}>
              <span style={styles.labelCaption}>Seccion de presupuestos</span>
              <select
                aria-label="Seccion de presupuestos"
                onChange={(event) => setActiveSection(event.target.value as QuoteSection)}
                style={styles.select}
                value={activeSection}
              >
                {quoteSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div style={styles.platformSectionNav} role="tablist" aria-label="Navegacion de presupuestos">
              {quoteSections.map((section) => (
                <button
                  aria-pressed={activeSection === section.id}
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  style={activeSection === section.id ? styles.platformSectionButtonActive : styles.platformSectionButton}
                  type="button"
                >
                  {section.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeSection === 'list' ? (
        <section style={styles.tablePanel} aria-labelledby="quotes-title">
          <div style={styles.panelHeader}>
            <div>
              <h2 id="quotes-title" style={styles.panelTitle}>
                Listado
              </h2>
              <p style={styles.panelSubtitle}>Ordena, filtra y reabre presupuestos desde una lectura mas clara.</p>
            </div>
          </div>
          <div style={styles.quoteFilterBar}>
            <label style={styles.compactLabel}>
              Buscar
              <input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cliente, numero o titulo"
                style={styles.searchInput}
                value={search}
              />
            </label>
            <div aria-label="Filtro de estado" style={styles.statusFilterRow}>
              <button
                onClick={() => setStatusFilter('all')}
                style={statusFilter === 'all' ? styles.filterChipActive : styles.filterChip}
                type="button"
              >
                Todos
              </button>
              {Object.entries(statusLabels).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value as QuoteStatus)}
                  style={statusFilter === value ? styles.filterChipActive : styles.filterChip}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {quotes.length === 0 ? (
            <p style={styles.emptyState}>Todavia no hay presupuestos.</p>
          ) : filteredQuotes.length === 0 ? (
            <p style={styles.emptyState}>No hay presupuestos para esos filtros.</p>
          ) : (
            <div style={styles.quoteList}>
              {filteredQuotes.map((quote) => (
                <button
                  key={quote.id}
                  onClick={() => openExistingQuote(quote.id)}
                  style={quote.id === selectedQuoteId ? styles.quoteListActive : styles.quoteListButton}
                  type="button"
                >
                  <div style={styles.quoteListCard}>
                    <div style={styles.quoteRowMain}>
                      <span style={styles.quoteNumber}>{quote.number}</span>
                      <strong>{clientName(clients, quote.client_id)}</strong>
                      <span style={styles.quoteTitleText}>{quote.title || 'Sin titulo'}</span>
                      <span style={styles.mutedText}>{formatDate(quote.created_at)}</span>
                    </div>
                    <div style={styles.quoteListAside}>
                      <StatusBadge status={quote.status} />
                      <strong>{formatMoney(quote.total)}</strong>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeSection === 'editor' ? (
        <section style={styles.tablePanel} aria-labelledby="quote-detail-title">
          <div style={styles.panelHeader}>
            <div>
              <h2 id="quote-detail-title" style={styles.panelTitle}>
                {selectedQuote ? selectedQuote.number : 'Editor de presupuesto'}
              </h2>
              <p style={styles.panelSubtitle}>
                {selectedQuote
                  ? 'Trabaja el presupuesto seleccionado en un unico flujo de lectura y edicion.'
                  : 'Crea un borrador y continua cargando servicios sin salir del editor.'}
              </p>
            </div>
            {selectedQuote ? (
              <div style={styles.actions}>
                {selectedQuote.status === 'draft' ? (
                  <button onClick={() => onTransition(selectedQuote, 'issue')} style={styles.primaryButton} type="button">
                    Emitir
                  </button>
                ) : null}
                {selectedQuote.status === 'issued' ? (
                  <>
                    <button onClick={() => onTransition(selectedQuote, 'accept')} style={styles.primaryButton} type="button">
                      Aceptar
                    </button>
                    <button onClick={() => onTransition(selectedQuote, 'reject')} style={styles.secondaryButton} type="button">
                      Rechazar
                    </button>
                  </>
                ) : null}
                <button
                  aria-label="Descargar PDF"
                  onClick={() => onDownloadPdf(selectedQuote)}
                  style={styles.iconActionButton}
                  title="Descargar PDF"
                  type="button"
                >
                  <FileText aria-hidden="true" size={15} strokeWidth={2.2} />
                </button>
                <button
                  aria-label="Ver cliente"
                  onClick={() => {
                    void onEditClient(selectedQuote.client_id, 'data');
                  }}
                  style={styles.iconActionButton}
                  title="Ver cliente"
                  type="button"
                >
                  <Eye aria-hidden="true" size={15} strokeWidth={2.2} />
                </button>
              </div>
            ) : null}
          </div>

          {isCreatingNew || !selectedQuote ? (
            <form onSubmit={handleCreateQuote} style={styles.quoteEditorSection}>
              <section style={styles.quoteEditorBlock}>
                <div>
                  <h3 style={styles.compactTitle}>Cliente</h3>
                  <p style={styles.helperText}>Selecciona primero a quien va dirigido el presupuesto.</p>
                </div>
                <label style={styles.label}>
                  Cliente
                  <select
                    onChange={(event) => onFormChange({ ...form, client_id: event.target.value })}
                    required
                    style={styles.input}
                    value={form.client_id}
                  >
                    <option value="">Seleccionar cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </label>
              </section>
              <section style={styles.quoteEditorBlock}>
                <div>
                  <h3 style={styles.compactTitle}>Datos del presupuesto</h3>
                  <p style={styles.helperText}>Define titulo, vigencia y notas generales antes de emitir.</p>
                </div>
                <Field label="Titulo" value={form.title} onChange={(title) => onFormChange({ ...form, title })} />
                <Field
                  label="Valido hasta"
                  type="date"
                  value={form.valid_until}
                  onChange={(validUntil) => onFormChange({ ...form, valid_until: validUntil })}
                />
                <label style={styles.label}>
                  Notas
                  <textarea
                    onChange={(event) => onFormChange({ ...form, notes: event.target.value })}
                    rows={3}
                    style={styles.textarea}
                    value={form.notes}
                  />
                </label>
              </section>
              <section style={styles.quoteEditorBlock}>
                <div>
                  <h3 style={styles.compactTitle}>Totales y acciones</h3>
                  <p style={styles.helperText}>Primero crea el borrador. Luego podras cargar servicios y emitirlo.</p>
                </div>
                <button disabled={isSaving || clients.length === 0} style={styles.primaryButton} type="submit">
                  Crear borrador
                </button>
              </section>
            </form>
          ) : (
            <>
              <QuoteProgress quote={selectedQuote} />
              <div style={styles.quoteEditorSection}>
                <section style={styles.quoteEditorBlock}>
                  <div>
                    <h3 style={styles.compactTitle}>Cliente</h3>
                    <p style={styles.helperText}>Empresa o cliente asociado al presupuesto actual.</p>
                  </div>
                    <div style={styles.quoteSummaryCard}>
                      <div style={styles.panelHeaderCompact}>
                        <strong>{clientName(clients, selectedQuote.client_id)}</strong>
                        <button
                          aria-label="Abrir ficha del cliente"
                          onClick={() => {
                            void onEditClient(selectedQuote.client_id, 'data');
                          }}
                          style={styles.iconActionButton}
                          title="Abrir ficha del cliente"
                          type="button"
                        >
                          <Eye aria-hidden="true" size={15} strokeWidth={2.2} />
                        </button>
                      </div>
                    <div style={styles.detailMeta}>
                      <span>{selectedQuote.title || 'Sin titulo'}</span>
                      <StatusBadge status={selectedQuote.status} />
                    </div>
                  </div>
                </section>

                <section style={styles.quoteEditorBlock}>
                  <div>
                    <h3 style={styles.compactTitle}>Datos del presupuesto</h3>
                    <p style={styles.helperText}>Resumen operativo del presupuesto seleccionado.</p>
                  </div>
                  <div style={styles.quoteSummaryGrid}>
                    <div style={styles.quoteSummaryCard}>
                      <span style={styles.quoteSummaryLabel}>Numero</span>
                      <strong>{selectedQuote.number}</strong>
                    </div>
                    <div style={styles.quoteSummaryCard}>
                      <span style={styles.quoteSummaryLabel}>Fecha</span>
                      <strong>{formatDate(selectedQuote.created_at)}</strong>
                    </div>
                    <div style={styles.quoteSummaryCard}>
                      <span style={styles.quoteSummaryLabel}>Vigencia</span>
                      <strong>{selectedQuote.valid_until ? formatDate(selectedQuote.valid_until) : 'Sin fecha'}</strong>
                    </div>
                    <div style={styles.quoteSummaryCard}>
                      <span style={styles.quoteSummaryLabel}>Notas</span>
                      <strong>{selectedQuote.notes || 'Sin notas'}</strong>
                    </div>
                  </div>
                </section>

                {canEditSelected ? (
                  <section style={styles.quoteEditorBlock} aria-label="Items de cobro">
                    <div>
                      <h3 style={styles.compactTitle}>Items de cobro</h3>
                      <p style={styles.helperText}>Agrega varios servicios seguidos sin salir del editor.</p>
                    </div>
                    <div style={styles.quoteCatalogSurface}>
                      <label style={styles.compactLabel}>
                        Buscar servicio
                        <input
                          onChange={(event) => setCatalogSearch(event.target.value)}
                          placeholder="Instalacion, mantenimiento o carga de gas"
                          style={styles.searchInput}
                          value={catalogSearch}
                        />
                      </label>
                      {costItems.length === 0 ? (
                        <p style={styles.emptyState}>Carga primero los servicios con su precio.</p>
                      ) : filteredCatalogItems.length === 0 ? (
                        <p style={styles.emptyState}>No hay servicios para esa busqueda.</p>
                      ) : (
                        <div style={styles.catalogGrid}>
                          {filteredCatalogItems.map((item) => (
                            <button
                              disabled={isSaving}
                              key={item.id}
                              onClick={() => onAddCostItem(selectedQuote, item)}
                              style={styles.catalogItemButton}
                              type="button"
                            >
                              <span>
                                <strong>{item.name}</strong>
                                {item.description ? <small style={styles.catalogItemDescription}>{item.description}</small> : null}
                              </span>
                              <span style={styles.catalogItemPrice}>{formatMoney(item.unit_cost)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                ) : null}

                <section style={styles.quoteEditorBlock}>
                  <div>
                    <h3 style={styles.compactTitle}>Totales y acciones</h3>
                    <p style={styles.helperText}>Revisa el detalle cargado y ejecuta solo las acciones validas para su estado.</p>
                  </div>
                  {selectedQuote.items.length === 0 ? (
                    <p style={styles.emptyState}>Agrega items desde el catalogo de servicios.</p>
                  ) : (
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Item</th>
                          <th style={styles.thRight}>Cant.</th>
                          <th style={styles.thRight}>Unitario</th>
                          <th style={styles.thRight}>IVA</th>
                          <th style={styles.thRight}>Total</th>
                          {canEditSelected ? <th style={styles.thRight}>Acciones</th> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedQuote.items.map((item) => (
                          <tr key={item.id}>
                            <td style={styles.td}>
                              <strong>{item.name}</strong>
                              {item.description ? (
                                <>
                                  <br />
                                  <span style={styles.mutedText}>{item.description}</span>
                                </>
                              ) : null}
                            </td>
                            <td style={styles.tdRight}>{item.quantity}</td>
                            <td style={styles.tdRight}>{formatMoney(item.unit_price)}</td>
                            <td style={styles.tdRight}>{item.tax_rate}%</td>
                            <td style={styles.tdRight}>{formatMoney(item.line_total)}</td>
                            {canEditSelected ? (
                              <td style={styles.tdRight}>
                                <button
                                  aria-label="Quitar item"
                                  onClick={() => onDeleteItem(selectedQuote, item.id)}
                                  style={styles.iconDangerButton}
                                  title="Quitar item"
                                  type="button"
                                >
                                  <Trash2 aria-hidden="true" size={15} strokeWidth={2.2} />
                                </button>
                              </td>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  <div style={styles.totals}>
                    <span>Subtotal {formatMoney(selectedQuote.subtotal)}</span>
                    <span>IVA {formatMoney(selectedQuote.tax_total)}</span>
                    <strong>Total {formatMoney(selectedQuote.total)}</strong>
                  </div>
                </section>
              </div>
            </>
          )}
        </section>
      ) : null}
    </section>
  );
}

function CompanyProfileView({
  form,
  isCompactLayout,
  isSaving,
  legalChangeForm,
  mode,
  onFormChange,
  onLegalChangeFormChange,
  onLegalChangeSubmit,
  onSubmit,
  requests,
}: {
  form: CompanyProfileForm;
  isCompactLayout: boolean;
  isSaving: boolean;
  legalChangeForm: TenantLegalChangeForm;
  mode: 'tenant' | 'platform';
  onFormChange: (form: CompanyProfileForm) => void;
  onLegalChangeFormChange: (form: TenantLegalChangeForm) => void;
  onLegalChangeSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  requests: TenantChangeRequest[];
}) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [activeSection, setActiveSection] = useState<CompanySection>('data');
  const hasLocalLogo = form.logo_url.startsWith('data:image/');
  const isPlatformProfile = mode === 'platform';
  const profileTitle = isPlatformProfile ? 'Perfil de plataforma' : 'Perfil de empresa';
  const profileSubtitle = isPlatformProfile
    ? 'Datos institucionales de FacturEasy para facturacion, branding y vista previa.'
    : 'Estos datos son opcionales y se usan para presupuestos, facturas e impresiones.';
  const lockedPanelTitle = isPlatformProfile ? 'Datos institucionales' : 'Datos fiscales bloqueados';
  const lockedPanelSubtitle = isPlatformProfile
    ? 'Configura la identidad visible de la plataforma para PDF, facturas y comunicaciones.'
    : 'Nombre, razon social y CUIT solo cambian con solicitud para evitar uso indebido de empresas.';
  const companySections: Array<{ id: CompanySection; label: string }> = [
    { id: 'data', label: 'Datos' },
    { id: 'billing', label: 'Facturacion' },
    { id: 'preview', label: 'Vista previa' },
  ];

  return (
    <section style={styles.companyWorkspace}>
      <div style={styles.companyWorkspaceHeader}>
        <div>
          <h2 style={styles.panelTitle}>{profileTitle}</h2>
          <p style={styles.panelSubtitle}>{profileSubtitle}</p>
        </div>
        {isCompactLayout ? (
          <label style={styles.platformSelectField}>
            <span style={styles.labelCaption}>Seccion de empresa</span>
            <select
              aria-label="Seccion de empresa"
              onChange={(event) => setActiveSection(event.target.value as CompanySection)}
              style={styles.select}
              value={activeSection}
            >
              {companySections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div style={styles.platformSectionNav} role="tablist" aria-label="Navegacion de empresa">
            {companySections.map((section) => (
              <button
                aria-pressed={activeSection === section.id}
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                style={activeSection === section.id ? styles.platformSectionButtonActive : styles.platformSectionButton}
                type="button"
              >
                {section.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeSection === 'data' ? (
        <section style={styles.profileGrid}>
          <form onSubmit={onSubmit} style={styles.formPanel}>
            <div style={styles.companyLogoCard}>
              <div style={styles.companyLogoPreviewFrame}>
                {form.logo_url ? (
                  <img alt="" src={form.logo_url} style={styles.companyLogoPreviewImage} />
                ) : (
                  <div style={styles.logoPlaceholder}>Logo</div>
                )}
              </div>
              <div style={styles.companyLogoInfo}>
                <strong>Identidad visual</strong>
                <p style={styles.panelSubtitle}>
                  Carga el logo una sola vez y valida al instante como se integra con el perfil y el PDF.
                </p>
                <div style={styles.actions}>
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    style={styles.secondaryButton}
                    type="button"
                  >
                    Subir logo local
                  </button>
                  {form.logo_url ? (
                    <button
                      onClick={() => onFormChange({ ...form, logo_url: '' })}
                      style={styles.linkButton}
                      type="button"
                    >
                      Quitar logo
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            <label style={styles.label}>
              URL de logo
              <input
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (!file) {
                    return;
                  }

                  if (!file.type.startsWith('image/')) {
                    void Swal.fire({
                      title: 'Archivo no valido',
                      text: 'Selecciona un archivo de imagen para usarlo como logo.',
                      icon: 'warning',
                      confirmButtonText: 'Cerrar',
                    });
                    event.target.value = '';
                    return;
                  }

                  const reader = new FileReader();
                  reader.onload = () => {
                    const result = reader.result;
                    if (typeof result === 'string') {
                      onFormChange({ ...form, logo_url: result });
                    }
                  };
                  reader.onerror = () => {
                    void Swal.fire({
                      title: 'No se pudo leer el archivo',
                      text: 'Intenta nuevamente con otra imagen.',
                      icon: 'error',
                      confirmButtonText: 'Cerrar',
                    });
                  };
                  reader.readAsDataURL(file);
                  event.target.value = '';
                }}
                ref={logoInputRef}
                style={{ display: 'none' }}
                type="file"
              />
              <input
                onChange={(event) => onFormChange({ ...form, logo_url: event.target.value })}
                placeholder="https://..."
                style={styles.input}
                value={hasLocalLogo ? '' : form.logo_url}
              />
              <small style={styles.panelSubtitle}>
                {hasLocalLogo
                  ? 'Logo local cargado. Se guardara como imagen embebida.'
                  : 'Tambien puedes pegar una URL publica de imagen.'}
              </small>
            </label>
            <section style={styles.lockedFiscalPanel}>
              <div>
                <strong>{lockedPanelTitle}</strong>
                <p style={styles.panelSubtitle}>{lockedPanelSubtitle}</p>
              </div>
              <div style={styles.lockedFiscalGrid}>
                <span>Empresa: {form.name || 'Sin cargar'}</span>
                <span>Razon social: {form.legal_name || 'Sin cargar'}</span>
                <span>CUIT: {form.tax_id || 'Sin cargar'}</span>
              </div>
            </section>
            <Field
              label="Direccion"
              value={form.address}
              onChange={(address) => onFormChange({ ...form, address })}
            />
            <section style={styles.formGridTwo}>
              <Field label="Telefono" value={form.phone} onChange={(phone) => onFormChange({ ...form, phone })} />
              <Field label="Email" type="email" value={form.email} onChange={(email) => onFormChange({ ...form, email })} />
            </section>
            <Field label="Sitio web" value={form.website} onChange={(website) => onFormChange({ ...form, website })} />
            <button disabled={isSaving} style={styles.primaryButton} type="submit">
              Guardar datos
            </button>
          </form>

          {isPlatformProfile ? null : (
            <form onSubmit={onLegalChangeSubmit} style={styles.formPanel}>
              <div>
                <h2 style={styles.panelTitle}>Solicitar cambio fiscal</h2>
                <p style={styles.panelSubtitle}>
                  La solicitud queda pendiente hasta que un administrador de plataforma la revise.
                </p>
              </div>
              <Field
                label="Nuevo nombre de empresa"
                value={legalChangeForm.proposed_name}
                onChange={(proposedName) => onLegalChangeFormChange({ ...legalChangeForm, proposed_name: proposedName })}
              />
              <Field
                label="Nueva razon social"
                value={legalChangeForm.proposed_legal_name}
                onChange={(proposedLegalName) =>
                  onLegalChangeFormChange({ ...legalChangeForm, proposed_legal_name: proposedLegalName })
                }
              />
              <Field
                label="Nuevo CUIT"
                value={legalChangeForm.proposed_tax_id}
                onChange={(proposedTaxId) => onLegalChangeFormChange({ ...legalChangeForm, proposed_tax_id: proposedTaxId })}
              />
              <label style={styles.label}>
                Motivo
                <textarea
                  onChange={(event) => onLegalChangeFormChange({ ...legalChangeForm, reason: event.target.value })}
                  rows={3}
                  style={styles.textarea}
                  value={legalChangeForm.reason}
                />
              </label>
              <button disabled={isSaving} style={styles.secondaryButton} type="submit">
                Enviar solicitud
              </button>
              {requests.length > 0 ? (
                <div style={styles.serviceList}>
                  <strong>Solicitudes recientes</strong>
                  {requests.slice(0, 3).map((request) => (
                    <article key={request.id} style={styles.serviceRecord}>
                      <span style={styles.categoryBadge}>{request.status}</span>
                      <span style={styles.mutedText}>
                        {[
                          request.proposed_name ? `Empresa: ${request.proposed_name}` : null,
                          request.proposed_legal_name ? `Razon social: ${request.proposed_legal_name}` : null,
                          request.proposed_tax_id ? `CUIT: ${request.proposed_tax_id}` : null,
                        ]
                          .filter(Boolean)
                          .join(' | ')}
                      </span>
                    </article>
                  ))}
                </div>
              ) : null}
            </form>
          )}
        </section>
      ) : null}

      {activeSection === 'billing' ? (
        <section style={styles.profileGrid}>
          <form onSubmit={onSubmit} style={styles.formPanel}>
            <div>
              <h3 style={styles.panelTitle}>Facturacion</h3>
              <p style={styles.panelSubtitle}>
                Ajusta los datos que afectan la salida del comprobante sin mezclar identidad institucional.
              </p>
            </div>
            <Field
              label="IVA general"
              min="0"
              max="100"
              step="0.01"
              type="number"
              value={form.default_tax_rate}
              onChange={(defaultTaxRate) => onFormChange({ ...form, default_tax_rate: defaultTaxRate })}
            />
            <label style={styles.label}>
              Leyenda para facturas
              <textarea
                onChange={(event) => onFormChange({ ...form, invoice_notes: event.target.value })}
                rows={5}
                style={styles.textarea}
                value={form.invoice_notes}
              />
            </label>
            <button disabled={isSaving} style={styles.primaryButton} type="submit">
              Guardar facturacion
            </button>
          </form>
        </section>
      ) : null}

      {activeSection === 'preview' ? (
        <section style={styles.tablePanel} aria-labelledby="profile-preview-title">
          <div style={styles.panelHeader}>
            <h2 id="profile-preview-title" style={styles.panelTitle}>
              Vista PDF
            </h2>
          </div>
          <div style={styles.pdfPreviewShell}>
            <article style={styles.pdfPreviewPage} aria-label="Vista previa PDF de factura">
              <header style={styles.pdfPreviewHeader}>
                <div>
                  <h3 style={styles.invoiceCompanyName}>{form.legal_name || form.name || 'FacturEasy'}</h3>
                  <p style={styles.pdfPreviewMuted}>{form.tax_id ? `CUIT ${form.tax_id}` : 'CUIT pendiente'}</p>
                  <p style={styles.pdfPreviewMuted}>{form.address || 'Direccion pendiente'}</p>
                  <p style={styles.pdfPreviewMuted}>
                    {[form.phone, form.email].filter(Boolean).join(' - ') || 'Contacto pendiente'}
                  </p>
                </div>
                {form.logo_url ? <img alt="" src={form.logo_url} style={styles.logoPreview} /> : <div style={styles.logoPlaceholder}>Logo</div>}
              </header>
              <section style={styles.pdfPreviewMeta}>
                <div>
                  <strong>Factura electronica</strong>
                  <p style={styles.pdfPreviewMuted}>Presupuesto Q-000001 - {formatDate(new Date().toISOString())}</p>
                </div>
                <div style={styles.pdfPreviewClient}>
                  <span>Cliente</span>
                  <strong>Cliente demo</strong>
                </div>
              </section>
              <table style={styles.pdfPreviewTable}>
                <thead>
                  <tr>
                    <th style={styles.pdfPreviewTh}>Servicio</th>
                    <th style={styles.pdfPreviewThRight}>Cantidad</th>
                    <th style={styles.pdfPreviewThRight}>Unitario</th>
                    <th style={styles.pdfPreviewThRight}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={styles.pdfPreviewTd}>Instalacion</td>
                    <td style={styles.pdfPreviewTdRight}>1</td>
                    <td style={styles.pdfPreviewTdRight}>{formatMoney(85000)}</td>
                    <td style={styles.pdfPreviewTdRight}>{formatMoney(85000)}</td>
                  </tr>
                  <tr>
                    <td style={styles.pdfPreviewTd}>Carga de gas</td>
                    <td style={styles.pdfPreviewTdRight}>1</td>
                    <td style={styles.pdfPreviewTdRight}>{formatMoney(60000)}</td>
                    <td style={styles.pdfPreviewTdRight}>{formatMoney(60000)}</td>
                  </tr>
                </tbody>
              </table>
              <footer style={styles.pdfPreviewTotals}>
                <span>Subtotal {formatMoney(145000)}</span>
                <span>IVA {formatMoney(30450)}</span>
                <strong>Total {formatMoney(175450)}</strong>
              </footer>
              {form.invoice_notes ? <p style={styles.pdfPreviewNotes}>{form.invoice_notes}</p> : null}
            </article>
          </div>
        </section>
      ) : null}
    </section>
  );
}

function TreasuryView({
  clients,
  isCompactLayout,
  onDownloadPdf,
  onOpenQuote,
  onSendInvoiceByWhatsApp,
  quotes,
}: {
  clients: Client[];
  isCompactLayout: boolean;
  onDownloadPdf: (quote: Quote) => void;
  onOpenQuote: (quoteId: string) => void;
  onSendInvoiceByWhatsApp: (quote: Quote) => void;
  quotes: Quote[];
}) {
  const [activeSection, setActiveSection] = useState<TreasurySection>('overview');
  const [isSmartTreasury, setIsSmartTreasury] = useState(false);
  const [movementFilter, setMovementFilter] = useState<TreasuryMovementFilter>('all');
  const acceptedQuotes = quotes.filter((quote) => quote.status === 'accepted');
  const issuedQuotes = quotes.filter((quote) => quote.status === 'issued');
  const rejectedQuotes = quotes.filter((quote) => quote.status === 'rejected');
  const treasurySections = [
    { id: 'overview' as const, label: 'Resumen' },
    { id: 'movements' as const, label: 'Movimientos' },
    { id: 'pending' as const, label: 'Cobros pendientes' },
  ];
  const treasuryMetrics = [
    { label: 'Facturado aceptado', value: formatMoney(sumQuotes(acceptedQuotes)) },
    { label: 'Pendiente emitido', value: formatMoney(sumQuotes(issuedQuotes)) },
    { label: 'Rechazado', value: formatMoney(sumQuotes(rejectedQuotes)) },
    { label: 'Total de presupuestos', value: String(quotes.length) },
    {
      label: 'Mes actual',
      value: new Intl.DateTimeFormat('es-AR', {
        month: 'long',
        timeZone: 'America/Buenos_Aires',
        year: 'numeric',
      }).format(new Date()),
    },
  ];
  const averageAccepted = acceptedQuotes.length
    ? sumQuotes(acceptedQuotes) / acceptedQuotes.length
    : 0;
  const conversionRate = quotes.length ? (acceptedQuotes.length / quotes.length) * 100 : 0;
  const latestMovements = [...quotes]
    .filter((quote) => quote.status !== 'draft')
    .filter((quote) => movementFilter === 'all' || quote.status === movementFilter)
    .sort((left, right) => quoteTimestamp(right) - quoteTimestamp(left))
    .slice(0, 12);
  const pendingQuotes = [...issuedQuotes].sort((left, right) => quoteTimestamp(right) - quoteTimestamp(left));
  const smartTreasury = buildSmartTreasury(acceptedQuotes, quotes);

  if (isSmartTreasury) {
    return (
      <>
        <section style={styles.smartHeader}>
          <div>
            <h2 style={styles.panelTitle}>Tesoreria inteligente</h2>
            <p style={styles.panelSubtitle}>Lectura rapida de cierres, facturacion y oportunidades de seguimiento.</p>
          </div>
          <button onClick={() => setIsSmartTreasury(false)} style={styles.secondaryButton} type="button">
            Volver a tesoreria
          </button>
        </section>

        <section style={styles.metrics} aria-label="Indicadores inteligentes">
          {smartTreasury.cards.map((card) => (
            <article key={card.label} style={styles.metricCard}>
              <p style={styles.metricLabel}>{card.label}</p>
              <strong style={styles.metricValue}>{card.value}</strong>
            </article>
          ))}
        </section>

        <section style={styles.gridTwo}>
          <ChartPanel
            emptyText="Todavia no hay presupuestos aceptados."
            rows={smartTreasury.membershipsByMonth}
            title="Presupuestos aceptados por mes"
            valueFormatter={(value) => `${value.toFixed(0)} cierres`}
          />
          <ChartPanel
            emptyText="Todavia no hay facturacion aceptada."
            rows={smartTreasury.months}
            title="Meses mas facturados"
            valueFormatter={formatMoney}
          />
        </section>

        <section style={styles.tablePanel} aria-labelledby="smart-report-title">
          <div style={styles.panelHeader}>
            <h2 id="smart-report-title" style={styles.panelTitle}>
              Reporte inteligente
            </h2>
          </div>
          <div style={styles.smartReportGrid}>
            {smartTreasury.insights.map((insight) => (
              <article key={insight.title} style={styles.smartInsight}>
                <strong>{insight.title}</strong>
                <p>{insight.text}</p>
              </article>
            ))}
          </div>
        </section>
      </>
    );
  }

  return (
    <section style={styles.companyWorkspace}>
      <section style={styles.smartHeader}>
        <div>
          <h2 style={styles.panelTitle}>Tesoreria</h2>
          <p style={styles.panelSubtitle}>Seguimiento operativo de presupuestos, cobros y movimientos del negocio.</p>
        </div>
        <div style={styles.actions}>
          <button onClick={() => setIsSmartTreasury(true)} style={styles.primaryButton} type="button">
            Tesoreria inteligente
          </button>
          {isCompactLayout ? (
            <label style={styles.platformSelectField}>
              <span style={styles.labelCaption}>Seccion de tesoreria</span>
              <select
                aria-label="Seccion de tesoreria"
                onChange={(event) => setActiveSection(event.target.value as TreasurySection)}
                style={styles.select}
                value={activeSection}
              >
                {treasurySections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div style={styles.platformSectionNav} role="tablist" aria-label="Navegacion de tesoreria">
              {treasurySections.map((section) => (
                <button
                  aria-pressed={activeSection === section.id}
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  style={activeSection === section.id ? styles.platformSectionButtonActive : styles.platformSectionButton}
                  type="button"
                >
                  {section.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {activeSection === 'overview' ? (
        <>
          <section style={styles.metrics} aria-label="Metricas de tesoreria">
            {treasuryMetrics.map((metric) => (
              <article key={metric.label} style={styles.metricCard}>
                <p style={styles.metricLabel}>{metric.label}</p>
                <strong style={styles.metricValue}>{metric.value}</strong>
              </article>
            ))}
          </section>

          <section style={styles.gridTwo}>
            <section style={styles.tablePanel} aria-labelledby="treasury-health-title">
              <div style={styles.panelHeader}>
                <div>
                  <h2 id="treasury-health-title" style={styles.panelTitle}>
                    Resumen de tesoreria
                  </h2>
                  <p style={styles.panelSubtitle}>Lectura rapida de conversion, volumen y ticket promedio.</p>
                </div>
              </div>
              <div style={styles.treasuryOverviewStrip}>
                <span style={styles.clientMetaPill}>{acceptedQuotes.length} aceptados</span>
                <span style={styles.clientMetaPill}>{issuedQuotes.length} emitidos</span>
                <span style={styles.clientMetaPill}>{rejectedQuotes.length} rechazados</span>
              </div>
              <div style={styles.categoryGrid}>
                <div style={styles.categoryRow}>
                  <span>Ticket promedio aceptado</span>
                  <strong>{formatMoney(String(averageAccepted))}</strong>
                </div>
                <div style={styles.categoryRow}>
                  <span>Conversion aceptada</span>
                  <strong>{conversionRate.toFixed(0)}%</strong>
                </div>
                <div style={styles.categoryRow}>
                  <span>Presupuestos aceptados</span>
                  <strong>{acceptedQuotes.length}</strong>
                </div>
                <div style={styles.categoryRow}>
                  <span>Presupuestos emitidos</span>
                  <strong>{issuedQuotes.length}</strong>
                </div>
              </div>
            </section>

            <section style={styles.tablePanel} aria-labelledby="treasury-attention-title">
              <div style={styles.panelHeader}>
                <div>
                  <h2 id="treasury-attention-title" style={styles.panelTitle}>
                    Atencion inmediata
                  </h2>
                  <p style={styles.panelSubtitle}>Presupuestos emitidos que todavia requieren seguimiento.</p>
                </div>
              </div>
              {pendingQuotes.length === 0 ? (
                <p style={styles.emptyState}>No hay presupuestos emitidos pendientes de seguimiento.</p>
              ) : (
                <div style={styles.clientList}>
                  {pendingQuotes.map((quote) => (
                    <article key={quote.id} style={styles.treasuryMovementRow}>
                      <div style={styles.treasuryMovementPrimary}>
                        <strong>{clientName(clients, quote.client_id)}</strong>
                        <span style={styles.treasuryMovementMeta}>
                          {quote.number} - {formatDate(quote.issued_at ?? quote.created_at)}
                        </span>
                        <span style={styles.mutedText}>{quote.title || 'Sin titulo'}</span>
                      </div>
                      <StatusBadge status={quote.status} />
                      <strong style={styles.treasuryMovementAmount}>{formatMoney(quote.total)}</strong>
                      <button
                        aria-label="Abrir presupuesto"
                        onClick={() => onOpenQuote(quote.id)}
                        style={styles.iconActionButton}
                        title="Abrir presupuesto"
                        type="button"
                      >
                        <Eye aria-hidden="true" size={15} strokeWidth={2.2} />
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>
        </>
      ) : null}

      {activeSection === 'movements' ? (
        <section style={styles.tablePanel} aria-labelledby="treasury-movements-title">
          <div style={styles.panelHeader}>
            <div>
              <h2 id="treasury-movements-title" style={styles.panelTitle}>
                Movimientos
              </h2>
              <p style={styles.panelSubtitle}>Cronologia de presupuestos emitidos, aceptados y rechazados.</p>
            </div>
          </div>
          <div style={styles.platformFilterBar}>
            {[
              { key: 'all', label: 'Todos' },
              { key: 'accepted', label: 'Aceptados' },
              { key: 'issued', label: 'Emitidos' },
              { key: 'rejected', label: 'Rechazados' },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setMovementFilter(filter.key as TreasuryMovementFilter)}
                style={movementFilter === filter.key ? styles.platformFilterButtonActive : styles.platformFilterButton}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
          {latestMovements.length === 0 ? (
            <p style={styles.emptyState}>No hay movimientos para ese filtro.</p>
          ) : (
            <div style={styles.clientList}>
              {latestMovements.map((quote) => (
                <article key={quote.id} style={styles.treasuryMovementRow}>
                  <div style={styles.treasuryMovementPrimary}>
                    <strong>{clientName(clients, quote.client_id)}</strong>
                    <span style={styles.treasuryMovementMeta}>
                      {quote.number} - {formatDate(quote.issued_at ?? quote.created_at)}
                    </span>
                    <span style={styles.mutedText}>{quote.title || 'Sin titulo'}</span>
                  </div>
                  <StatusBadge status={quote.status} />
                  <strong style={styles.treasuryMovementAmount}>{formatMoney(quote.total)}</strong>
                  <button
                    aria-label="Abrir presupuesto"
                    onClick={() => onOpenQuote(quote.id)}
                    style={styles.iconActionButton}
                    title="Abrir presupuesto"
                    type="button"
                  >
                    <Eye aria-hidden="true" size={15} strokeWidth={2.2} />
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeSection === 'pending' ? (
        <section style={styles.tablePanel} aria-labelledby="treasury-pending-title">
          <div style={styles.panelHeader}>
            <div>
              <h2 id="treasury-pending-title" style={styles.panelTitle}>
                Cobros pendientes
              </h2>
              <p style={styles.panelSubtitle}>Cola operativa para seguimiento, envio y reapertura rapida.</p>
            </div>
          </div>
          {pendingQuotes.length === 0 ? (
            <p style={styles.emptyState}>No hay cobros pendientes en este momento.</p>
          ) : (
            <div style={styles.clientList}>
              {pendingQuotes.map((quote) => (
                <article key={quote.id} style={styles.treasuryMovementRow}>
                  <div style={styles.treasuryMovementPrimary}>
                    <strong>{clientName(clients, quote.client_id)}</strong>
                    <span style={styles.treasuryMovementMeta}>
                      {quote.number} - {formatDate(quote.issued_at ?? quote.created_at)}
                    </span>
                    <span style={styles.mutedText}>{quote.title || 'Sin titulo'}</span>
                  </div>
                  <StatusBadge status={quote.status} />
                  <strong style={styles.treasuryMovementAmount}>{formatMoney(quote.total)}</strong>
                  <div style={styles.treasuryActionGroup}>
                    <button
                      aria-label="Abrir presupuesto"
                      onClick={() => onOpenQuote(quote.id)}
                      style={styles.iconActionButton}
                      title="Abrir presupuesto"
                      type="button"
                    >
                      <Eye aria-hidden="true" size={15} strokeWidth={2.2} />
                    </button>
                    <button
                      aria-label="Enviar PDF por WhatsApp"
                      onClick={() => onSendInvoiceByWhatsApp(quote)}
                      style={styles.whatsAppIconButton}
                      title="Enviar PDF por WhatsApp"
                      type="button"
                    >
                      <MessageCircle aria-hidden="true" size={16} strokeWidth={2.2} />
                    </button>
                    <button
                      aria-label="Descargar PDF"
                      onClick={() => onDownloadPdf(quote)}
                      style={styles.iconActionButton}
                      title="Descargar PDF"
                      type="button"
                    >
                      <FileText aria-hidden="true" size={15} strokeWidth={2.2} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </section>
  );
}

function PlatformAdminView({
  activeSection,
  changeRequests,
  isCompactLayout,
  isSaving,
  memberships,
  onChangeSection,
  onApproveFiscalChange,
  onApproveSignup,
  onMarkMembershipPaid,
  onUpdateMembershipPayment,
  onCancelMembershipPayment,
  onMarkSignupContacted,
  onRejectFiscalChange,
  onRejectSignup,
  onSendMembershipQuoteByEmail,
  onSendMembershipQuoteByWhatsApp,
  signupRequests,
}: {
  activeSection: PlatformSection;
  changeRequests: TenantChangeRequest[];
  isCompactLayout: boolean;
  isSaving: boolean;
  memberships: PlatformTenantMembership[];
  onChangeSection: (section: PlatformSection) => void;
  onApproveFiscalChange: (request: TenantChangeRequest) => void;
  onApproveSignup: (request: TenantSignupRequest, adminPassword: string) => void;
  onMarkMembershipPaid: (
    membership: PlatformTenantMembership,
    payload: { months_covered: number; amount?: string | null; notes?: string | null },
  ) => void;
  onUpdateMembershipPayment: (
    membership: PlatformTenantMembership,
    payment: PlatformTenantMembership['payments'][number],
    payload: { paid_at: string; months_covered: number; amount?: string | null; notes?: string | null },
  ) => void;
  onCancelMembershipPayment: (
    membership: PlatformTenantMembership,
    payment: PlatformTenantMembership['payments'][number],
    payload: { reason: string },
  ) => void;
  onMarkSignupContacted: (request: TenantSignupRequest) => void;
  onRejectFiscalChange: (request: TenantChangeRequest) => void;
  onRejectSignup: (request: TenantSignupRequest) => void;
  onSendMembershipQuoteByEmail: (payment: PlatformTenantMembership['payments'][number]) => void;
  onSendMembershipQuoteByWhatsApp: (payment: PlatformTenantMembership['payments'][number]) => void;
  signupRequests: TenantSignupRequest[];
}) {
  const pendingSignupRequests = signupRequests.filter((request) => request.status === 'pending');
  const historicalSignupRequests = signupRequests.filter((request) => request.status !== 'pending');
  const pendingChangeRequests = changeRequests.filter((request) => request.status === 'pending');
  const historicalChangeRequests = changeRequests.filter((request) => request.status !== 'pending');
  const dueSoonMemberships = memberships.filter((membership) => {
    if (!membership.membership_due_date) {
      return false;
    }

    const days = daysUntilDate(membership.membership_due_date);
    return days >= 0 && days <= 3;
  });
  const expiredMemberships = memberships.filter((membership) => {
    if (!membership.membership_due_date) {
      return membership.membership_status === 'expired';
    }

    return daysUntilDate(membership.membership_due_date) < 0;
  });
  const activeMemberships = memberships.filter((membership) => membership.membership_status === 'active');
  const amountDueThisMonth = [...expiredMemberships, ...dueSoonMemberships].reduce(
    (total, membership) => total + Number(membership.membership_monthly_fee ?? 0),
    0,
  );
  const [signupViewMode, setSignupViewMode] = useState<'pending' | 'history'>('pending');
  const [changeViewMode, setChangeViewMode] = useState<'pending' | 'history'>('pending');
  const [membershipFilter, setMembershipFilter] = useState<MembershipFilter>('all');
  const [membershipViewMode, setMembershipViewMode] = useState<'pending' | 'history'>('pending');
  const membershipCounts = {
    active: activeMemberships.filter((membership) => {
      if (!membership.membership_due_date) {
        return membership.membership_status === 'active';
      }

      return membership.membership_status === 'active' && daysUntilDate(membership.membership_due_date) > 3;
    }).length,
    dueSoon: dueSoonMemberships.length,
    expired: expiredMemberships.length,
  };
  const filteredMemberships = memberships.filter((membership) => {
    const days = membership.membership_due_date ? daysUntilDate(membership.membership_due_date) : null;

    if (membershipFilter === 'expired') {
      return days !== null ? days < 0 : membership.membership_status === 'expired';
    }

    if (membershipFilter === 'due_soon') {
      return days !== null && days >= 0 && days <= 3;
    }

    if (membershipFilter === 'active') {
      return membership.membership_status === 'active' && (days === null || days > 3);
    }

    return true;
  });
  const membershipPaymentHistory = memberships
    .flatMap((membership) =>
      membership.payments.map((payment) => ({
        membership,
        payment,
      })),
    )
    .sort((left, right) => right.payment.paid_at.localeCompare(left.payment.paid_at));
  const platformSections: Array<{ id: PlatformSection; label: string }> = [
    { id: 'overview', label: 'Resumen' },
    { id: 'signups', label: `Solicitudes (${pendingSignupRequests.length})` },
    { id: 'changes', label: `Cambios fiscales (${pendingChangeRequests.length})` },
    { id: 'memberships', label: `Membresias (${expiredMemberships.length + dueSoonMemberships.length})` },
  ];

  useEffect(() => {
    if (activeSection === 'signups') {
      setSignupViewMode('pending');
    }

    if (activeSection === 'changes') {
      setChangeViewMode('pending');
    }

    if (activeSection === 'memberships') {
      setMembershipViewMode('pending');
    }
  }, [activeSection]);

  return (
    <>
      <section style={styles.platformWorkspace}>
        <header style={styles.platformWorkspaceHeader}>
          <div>
            <h2 style={styles.panelTitle}>Centro de plataforma</h2>
            <p style={styles.panelSubtitle}>Operacion primero, historico como acceso secundario.</p>
          </div>
          {isCompactLayout ? (
            <label style={{ ...styles.label, ...styles.platformSelectField }}>
              <span>Seccion de plataforma</span>
              <select
                aria-label="Seccion de plataforma"
                onChange={(event) => onChangeSection(event.target.value as PlatformSection)}
                style={styles.input}
                value={activeSection}
              >
                {platformSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div style={styles.platformSectionNav} role="tablist" aria-label="Navegacion de plataforma">
              {platformSections.map((section) => (
                <button
                  key={section.id}
                  aria-pressed={activeSection === section.id}
                  onClick={() => onChangeSection(section.id)}
                  style={activeSection === section.id ? styles.platformSectionButtonActive : styles.platformSectionButton}
                  type="button"
                >
                  {section.label}
                </button>
              ))}
            </div>
          )}
        </header>

        {activeSection === 'overview' ? (
          <>
            <section style={styles.metrics} aria-label="Estado de plataforma">
              <article style={styles.metricCard}>
                <p style={styles.metricLabel}>Solicitudes pendientes</p>
                <strong style={styles.metricValue}>{pendingSignupRequests.length}</strong>
              </article>
              <article style={styles.metricCard}>
                <p style={styles.metricLabel}>Cambios fiscales pendientes</p>
                <strong style={styles.metricValue}>{pendingChangeRequests.length}</strong>
              </article>
              <article style={styles.metricCard}>
                <p style={styles.metricLabel}>Membresias activas</p>
                <strong style={styles.metricValue}>{activeMemberships.length}</strong>
              </article>
              <article style={styles.metricCard}>
                <p style={styles.metricLabel}>Membresias vencidas</p>
                <strong style={styles.metricValue}>{expiredMemberships.length}</strong>
              </article>
              <article style={styles.metricCard}>
                <p style={styles.metricLabel}>Vencen en 3 dias</p>
                <strong style={styles.metricValue}>{dueSoonMemberships.length}</strong>
              </article>
              <article style={styles.metricCard}>
                <p style={styles.metricLabel}>A cobrar este mes</p>
                <strong style={styles.metricValue}>{formatMoney(amountDueThisMonth)}</strong>
              </article>
            </section>

            <section style={styles.tablePanel}>
              <div style={styles.panelHeader}>
                <div>
                  <h2 style={styles.panelTitle}>Resumen de plataforma</h2>
                  <p style={styles.panelSubtitle}>Pendientes reales, proximos vencimientos y caja operativa.</p>
                </div>
              </div>
              <div style={styles.platformImmediateList}>
                <div style={styles.platformImmediatePanel}>
                  <h3 style={styles.platformImmediateTitle}>Atencion inmediata</h3>
                  {pendingSignupRequests.length > 0 ? (
                    <button onClick={() => onChangeSection('signups')} style={styles.platformImmediateItem} type="button">
                      <strong>{pendingSignupRequests[0].company_name}</strong>
                      <span style={styles.mutedText}>Nueva solicitud pendiente de revision.</span>
                    </button>
                  ) : null}
                  {pendingChangeRequests.length > 0 ? (
                    <button onClick={() => onChangeSection('changes')} style={styles.platformImmediateItem} type="button">
                      <strong>{pendingChangeRequests[0].current_name ?? 'Cambio fiscal pendiente'}</strong>
                      <span style={styles.mutedText}>Hay cambios fiscales esperando aprobacion.</span>
                    </button>
                  ) : null}
                  {expiredMemberships.slice(0, 2).map((membership) => (
                    <button
                      key={`expired-${membership.id}`}
                      onClick={() => {
                        setMembershipFilter('expired');
                        onChangeSection('memberships');
                      }}
                      style={styles.platformImmediateItem}
                      type="button"
                    >
                      <strong>{membership.name}</strong>
                      <span style={styles.mutedText}>Membresia vencida. Requiere registro de pago.</span>
                    </button>
                  ))}
                  {dueSoonMemberships.slice(0, 2).map((membership) => (
                    <button
                      key={`due-soon-${membership.id}`}
                      onClick={() => {
                        setMembershipFilter('due_soon');
                        onChangeSection('memberships');
                      }}
                      style={styles.platformImmediateItem}
                      type="button"
                    >
                      <strong>{membership.name}</strong>
                      <span style={styles.mutedText}>
                        Vence el {membership.membership_due_date ? formatDate(membership.membership_due_date) : 'sin fecha'}.
                      </span>
                    </button>
                  ))}
                  {pendingSignupRequests.length === 0 &&
                  pendingChangeRequests.length === 0 &&
                  expiredMemberships.length === 0 &&
                  dueSoonMemberships.length === 0 ? (
                    <p style={styles.emptyState}>No hay pendientes operativos inmediatos.</p>
                  ) : null}
                </div>
              </div>
            </section>
          </>
        ) : null}

        {activeSection === 'signups' ? (
          <section style={styles.tablePanel}>
            <div style={styles.panelHeader}>
              <div>
                <h2 style={styles.panelTitle}>Solicitudes de alta</h2>
                <p style={styles.panelSubtitle}>Solo pendientes en la vista principal. Las resueltas quedan fuera del flujo diario.</p>
              </div>
            </div>
            <div style={styles.platformFilterBar}>
              <button
                aria-pressed={signupViewMode === 'pending'}
                onClick={() => setSignupViewMode('pending')}
                style={signupViewMode === 'pending' ? styles.platformFilterButtonActive : styles.platformFilterButton}
                title="Pendientes"
                type="button"
              >
                <span style={styles.buttonWithIcon}>
                  <Clock3 aria-hidden="true" size={14} strokeWidth={2.2} />
                  <span>Pendientes</span>
                </span>
              </button>
              <button
                aria-pressed={signupViewMode === 'history'}
                onClick={() => setSignupViewMode('history')}
                style={signupViewMode === 'history' ? styles.platformFilterButtonActive : styles.platformFilterButton}
                title="Historial"
                type="button"
              >
                <span style={styles.buttonWithIcon}>
                  <History aria-hidden="true" size={14} strokeWidth={2.2} />
                  <span>Historial</span>
                </span>
              </button>
            </div>
            {signupViewMode === 'pending' && pendingSignupRequests.length === 0 ? (
              <p style={styles.emptyState}>No hay solicitudes de alta pendientes.</p>
            ) : null}
            {signupViewMode === 'history' && historicalSignupRequests.length === 0 ? (
              <p style={styles.emptyState}>Todavia no hay historial de solicitudes resueltas.</p>
            ) : null}
            {signupViewMode === 'pending' ? (
              <div style={styles.clientList}>
                {pendingSignupRequests.map((request) => (
                  <article key={request.id} style={styles.serviceRecord}>
                    <div style={styles.historyRecordHeader}>
                      <div style={styles.clientIdentity}>
                        <strong>{request.company_name}</strong>
                        <span style={styles.mutedText}>
                          {request.contact_name} - {request.email} - {request.phone}
                        </span>
                        {request.business_type ? <span style={styles.mutedText}>{request.business_type}</span> : null}
                      </div>
                      <span style={styles.categoryBadge}>{request.status}</span>
                    </div>
                    {request.message ? <p style={styles.serviceDescription}>{request.message}</p> : null}
                    {request.created_admin_email ? (
                      <p style={styles.serviceDescription}>Cuenta creada: {request.created_admin_email}</p>
                    ) : null}
                    <div style={styles.actions}>
                      <button
                        disabled={isSaving || request.status !== 'pending'}
                        onClick={async () => {
                          const result = await Swal.fire({
                            title: 'Crear cuenta',
                            text: `Defini una contrasena temporal para ${request.email}.`,
                            input: 'text',
                            inputAttributes: {
                              autocomplete: 'new-password',
                            },
                            inputPlaceholder: 'Contrasena temporal',
                            showCancelButton: true,
                            confirmButtonText: 'Crear cuenta',
                            cancelButtonText: 'Cancelar',
                            inputValidator: (value) =>
                              value && value.length >= 8 ? null : 'La contrasena debe tener al menos 8 caracteres.',
                          });

                          if (result.isConfirmed && typeof result.value === 'string') {
                            onApproveSignup(request, result.value);
                          }
                        }}
                        style={styles.primaryButton}
                        title="Crear cuenta"
                        type="button"
                      >
                        <span style={styles.buttonWithIcon}>
                          <UserRound aria-hidden="true" size={14} strokeWidth={2.2} />
                          <span>Crear cuenta</span>
                        </span>
                      </button>
                      <button
                        disabled={isSaving || request.status !== 'pending'}
                        onClick={() => onMarkSignupContacted(request)}
                        style={styles.secondaryButton}
                        title="Marcar como contactada"
                        type="button"
                      >
                        <span style={styles.buttonWithIcon}>
                          <Clock3 aria-hidden="true" size={14} strokeWidth={2.2} />
                          <span>Contactada</span>
                        </span>
                      </button>
                      <button
                        disabled={isSaving || request.status !== 'pending'}
                        onClick={() => onRejectSignup(request)}
                        style={styles.dangerOutlineButton}
                        title="Rechazar"
                        type="button"
                      >
                        <span style={styles.buttonWithIcon}>
                          <span aria-hidden="true">X</span>
                          <span>Rechazar</span>
                        </span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
            {signupViewMode === 'history' ? (
              <div style={styles.clientList}>
                {historicalSignupRequests.map((request) => (
                  <article key={request.id} style={styles.serviceRecord}>
                    <div style={styles.historyRecordHeader}>
                      <div style={styles.clientIdentity}>
                        <strong>{request.company_name}</strong>
                        <span style={styles.mutedText}>
                          {request.contact_name} - {request.email} - {request.phone}
                        </span>
                        {request.business_type ? <span style={styles.mutedText}>{request.business_type}</span> : null}
                      </div>
                      <span style={styles.categoryBadge}>{request.status}</span>
                    </div>
                    {request.message ? <p style={styles.serviceDescription}>{request.message}</p> : null}
                    {request.review_notes ? <p style={styles.serviceDescription}>Nota: {request.review_notes}</p> : null}
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {activeSection === 'changes' ? (
          <section style={styles.tablePanel}>
            <div style={styles.panelHeader}>
              <div>
                <h2 style={styles.panelTitle}>Cambios fiscales</h2>
                <p style={styles.panelSubtitle}>Solo pendientes en la vista principal. El historico se deja fuera del trabajo del dia.</p>
              </div>
            </div>
            <div style={styles.platformFilterBar}>
              <button
                aria-pressed={changeViewMode === 'pending'}
                onClick={() => setChangeViewMode('pending')}
                style={changeViewMode === 'pending' ? styles.platformFilterButtonActive : styles.platformFilterButton}
                title="Pendientes"
                type="button"
              >
                <span style={styles.buttonWithIcon}>
                  <Clock3 aria-hidden="true" size={14} strokeWidth={2.2} />
                  <span>Pendientes</span>
                </span>
              </button>
              <button
                aria-pressed={changeViewMode === 'history'}
                onClick={() => setChangeViewMode('history')}
                style={changeViewMode === 'history' ? styles.platformFilterButtonActive : styles.platformFilterButton}
                title="Historial"
                type="button"
              >
                <span style={styles.buttonWithIcon}>
                  <History aria-hidden="true" size={14} strokeWidth={2.2} />
                  <span>Historial</span>
                </span>
              </button>
            </div>
            {changeViewMode === 'pending' && pendingChangeRequests.length === 0 ? (
              <p style={styles.emptyState}>No hay cambios fiscales pendientes.</p>
            ) : null}
            {changeViewMode === 'history' && historicalChangeRequests.length === 0 ? (
              <p style={styles.emptyState}>Todavia no hay historial de cambios fiscales.</p>
            ) : null}
            {changeViewMode === 'pending' ? (
              <div style={styles.clientList}>
                {pendingChangeRequests.map((request) => (
                  <article key={request.id} style={styles.serviceRecord}>
                    <div style={styles.historyRecordHeader}>
                      <div style={styles.clientIdentity}>
                        <strong>{request.current_name}</strong>
                        <span style={styles.mutedText}>
                          {[
                            request.proposed_name ? `Empresa: ${request.proposed_name}` : null,
                            request.proposed_legal_name ? `Razon social: ${request.proposed_legal_name}` : null,
                            request.proposed_tax_id ? `CUIT: ${request.proposed_tax_id}` : null,
                          ]
                            .filter(Boolean)
                            .join(' | ')}
                        </span>
                      </div>
                      <span style={styles.categoryBadge}>{request.status}</span>
                    </div>
                    {request.reason ? <p style={styles.serviceDescription}>{request.reason}</p> : null}
                    <div style={styles.actions}>
                      <button
                        disabled={isSaving || request.status !== 'pending'}
                        onClick={() => onApproveFiscalChange(request)}
                        style={styles.primaryButton}
                        title="Aprobar"
                        type="button"
                      >
                        <span style={styles.buttonWithIcon}>
                          <span aria-hidden="true">OK</span>
                          <span>Aprobar</span>
                        </span>
                      </button>
                      <button
                        disabled={isSaving || request.status !== 'pending'}
                        onClick={() => onRejectFiscalChange(request)}
                        style={styles.dangerOutlineButton}
                        title="Rechazar"
                        type="button"
                      >
                        <span style={styles.buttonWithIcon}>
                          <span aria-hidden="true">X</span>
                          <span>Rechazar</span>
                        </span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
            {changeViewMode === 'history' ? (
              <div style={styles.clientList}>
                {historicalChangeRequests.map((request) => (
                  <article key={request.id} style={styles.serviceRecord}>
                    <div style={styles.historyRecordHeader}>
                      <div style={styles.clientIdentity}>
                        <strong>{request.current_name}</strong>
                        <span style={styles.mutedText}>
                          {[
                            request.proposed_name ? `Empresa: ${request.proposed_name}` : null,
                            request.proposed_legal_name ? `Razon social: ${request.proposed_legal_name}` : null,
                            request.proposed_tax_id ? `CUIT: ${request.proposed_tax_id}` : null,
                          ]
                            .filter(Boolean)
                            .join(' | ')}
                        </span>
                      </div>
                      <span style={styles.categoryBadge}>{request.status}</span>
                    </div>
                    {request.reason ? <p style={styles.serviceDescription}>{request.reason}</p> : null}
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {activeSection === 'memberships' ? (
          <section style={styles.tablePanel}>
            <div style={styles.panelHeader}>
              <div>
                <h2 style={styles.panelTitle}>Membresias SaaS</h2>
                <p style={styles.panelSubtitle}>Vencimiento mensual, filtros rapidos y seguimiento de cobro.</p>
              </div>
            </div>
            <div style={styles.platformFilterStack}>
              <div style={styles.platformFilterBar}>
                <button
                  aria-pressed={membershipViewMode === 'pending'}
                  onClick={() => setMembershipViewMode('pending')}
                  style={membershipViewMode === 'pending' ? styles.platformFilterButtonActive : styles.platformFilterButton}
                  title="Pendientes"
                  type="button"
                >
                  <span style={styles.buttonWithIcon}>
                    <Clock3 aria-hidden="true" size={14} strokeWidth={2.2} />
                    <span>Pendientes</span>
                  </span>
                </button>
                <button
                  aria-pressed={membershipViewMode === 'history'}
                  onClick={() => setMembershipViewMode('history')}
                  style={membershipViewMode === 'history' ? styles.platformFilterButtonActive : styles.platformFilterButton}
                  title="Historial"
                  type="button"
                >
                  <span style={styles.buttonWithIcon}>
                    <History aria-hidden="true" size={14} strokeWidth={2.2} />
                    <span>Historial</span>
                  </span>
                </button>
              </div>
              {membershipViewMode === 'pending' ? (
                <div style={styles.platformFilterBar}>
                  {[
                    { id: 'all' as const, label: 'Todas' },
                    { id: 'expired' as const, label: 'Vencidas' },
                    { id: 'due_soon' as const, label: 'Por vencer' },
                    { id: 'active' as const, label: 'Activas' },
                  ].map((filterOption) => (
                    <button
                      key={filterOption.id}
                      onClick={() => setMembershipFilter(filterOption.id)}
                      style={membershipFilter === filterOption.id ? styles.platformFilterButtonActive : styles.platformFilterButton}
                      type="button"
                    >
                      {filterOption.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {membershipViewMode === 'pending' && filteredMemberships.length === 0 ? (
              <p style={styles.emptyState}>No hay empresas con ese filtro operativo.</p>
            ) : null}
            {membershipViewMode === 'history' && membershipPaymentHistory.length === 0 ? (
              <p style={styles.emptyState}>Todavia no hay pagos registrados en el historial.</p>
            ) : null}
            {membershipViewMode === 'pending' ? (
              <div style={styles.clientList}>
                {filteredMemberships.map((membership) => (
                  <article key={membership.id} style={isCompactLayout ? styles.platformMembershipCard : styles.treasuryMovementRow}>
                <div style={styles.clientIdentity}>
                  <strong>{membership.name}</strong>
                  <span style={styles.mutedText}>
                    Vence: {membership.membership_due_date ? formatDate(membership.membership_due_date) : 'Sin fecha'}
                  </span>
                  <span style={styles.mutedText}>
                    Ultimo pago:{' '}
                    {membership.membership_last_payment_at ? formatDate(membership.membership_last_payment_at) : 'Sin registro'}
                  </span>
                  {membership.payments.some((payment) => payment.status === 'active') ? (
                    <div style={styles.membershipPaymentList}>
                      {membership.payments.filter((payment) => payment.status === 'active').slice(0, 4).map((payment) => (
                        <div key={payment.id} style={styles.membershipPaymentRow}>
                          <span style={styles.membershipPaymentChip}>
                            {formatMonthsCovered(payment.months_covered)} - {formatDate(payment.paid_at)}
                            {payment.amount ? ` - ${formatMoney(payment.amount)}` : ''}
                            {payment.quote_number ? ` - ${payment.quote_number}` : ''}
                          </span>
                          {payment.quote_id ? (
                            <div style={styles.membershipPaymentActions}>
                              <button
                                aria-label="Enviar por WhatsApp"
                                onClick={() => onSendMembershipQuoteByWhatsApp(payment)}
                                style={styles.whatsAppIconButton}
                                title="Enviar por WhatsApp"
                                type="button"
                              >
                                <MessageCircle aria-hidden="true" size={16} strokeWidth={2.2} />
                              </button>
                              <button
                                onClick={() => onSendMembershipQuoteByEmail(payment)}
                                style={styles.secondaryButton}
                                title="Enviar por Email"
                                type="button"
                              >
                                <span style={styles.buttonWithIcon}>
                                  <Mail aria-hidden="true" size={14} strokeWidth={2.2} />
                                  <span>Email</span>
                                </span>
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                <span
                  style={{
                    ...styles.statusBadge,
                    ...(membership.membership_status === 'active' ? styles.activeMembershipBadge : styles.expiredMembershipBadge),
                  }}
                >
                  {membership.membership_status === 'active' ? 'Activa' : 'Vencida'}
                </span>
                <div style={styles.platformMembershipActions}>
                  <button
                    disabled={isSaving}
                    onClick={async () => {
                      const result = await Swal.fire({
                        title: `Registrar pago de ${membership.name}`,
                        html: `
                        <label style="display:grid;gap:6px;text-align:left;margin-bottom:12px;">
                          <span>Periodo</span>
                          <select id="membership-months" class="swal2-input" style="margin:0;">
                            <option value="1">Mensual</option>
                            <option value="3">Trimestral</option>
                            <option value="6">Semestral</option>
                            <option value="12">Anual</option>
                          </select>
                        </label>
                        <label style="display:grid;gap:6px;text-align:left;margin-bottom:12px;">
                          <span>Monto total</span>
                          <input id="membership-amount" class="swal2-input" style="margin:0;" placeholder="Opcional" />
                        </label>
                        <label style="display:grid;gap:6px;text-align:left;">
                          <span>Nota</span>
                          <input id="membership-notes" class="swal2-input" style="margin:0;" placeholder="Pago trimestral, transferencia, etc." />
                        </label>
                      `,
                      focusConfirm: false,
                      preConfirm: () => {
                        const monthsValue =
                          (document.getElementById('membership-months') as HTMLSelectElement | null)?.value ?? '1';
                        const amountValue =
                          (document.getElementById('membership-amount') as HTMLInputElement | null)?.value.trim() ?? '';
                        const notesValue =
                          (document.getElementById('membership-notes') as HTMLInputElement | null)?.value.trim() ?? '';
                        const monthsCovered = Number(monthsValue);

                        if (![1, 3, 6, 12].includes(monthsCovered)) {
                          Swal.showValidationMessage('Elegi un periodo valido.');
                          return undefined;
                        }

                        if (amountValue && Number.isNaN(Number(amountValue))) {
                          Swal.showValidationMessage('El monto debe ser numerico.');
                          return undefined;
                        }

                        return {
                          amount: amountValue || null,
                          months_covered: monthsCovered,
                          notes: notesValue || null,
                        };
                        },
                        showCancelButton: true,
                        confirmButtonText: 'Registrar pago',
                        cancelButtonText: 'Cancelar',
                      });

                      if (result.isConfirmed && result.value) {
                        onMarkMembershipPaid(membership, result.value);
                      }
                    }}
                    style={styles.primaryButton}
                    title="Registrar pago"
                    type="button"
                  >
                    <span style={styles.buttonWithIcon}>
                      <Clock3 aria-hidden="true" size={14} strokeWidth={2.2} />
                      <span>Registrar pago</span>
                    </span>
                  </button>
                  {!isCompactLayout ? (
                    <span style={styles.platformMembershipMeta}>
                      {membershipFilter === 'all'
                        ? `Activas ${membershipCounts.active} | Por vencer ${membershipCounts.dueSoon} | Vencidas ${membershipCounts.expired}`
                        : membership.membership_due_date
                          ? `Vence ${formatDate(membership.membership_due_date)}`
                          : 'Sin fecha'}
                    </span>
                  ) : null}
                </div>
                  </article>
                ))}
              </div>
            ) : null}
            {membershipViewMode === 'history' ? (
              <div style={styles.clientList}>
                {membershipPaymentHistory.map(({ membership, payment }) => (
                  <article key={payment.id} style={styles.serviceRecord}>
                    <div style={styles.historyRecordHeader}>
                      <div style={styles.clientIdentity}>
                        <strong>{membership.name}</strong>
                        <span style={styles.mutedText}>
                          {formatDate(payment.paid_at)} - {formatMonthsCovered(payment.months_covered)}
                        </span>
                      </div>
                      <span
                        style={{
                          ...styles.categoryBadge,
                          ...(payment.status === 'cancelled' ? styles.historyRejectedBadge : styles.historyAcceptedBadge),
                        }}
                      >
                        {payment.status === 'cancelled' ? 'Anulado' : payment.quote_number ?? 'Sin presupuesto'}
                      </span>
                    </div>
                    <p style={styles.serviceDescription}>
                      {payment.amount ? formatMoney(payment.amount) : 'Sin monto cargado'}
                      {payment.notes ? ` | ${payment.notes}` : ''}
                      {payment.cancel_reason ? ` | Motivo de anulacion: ${payment.cancel_reason}` : ''}
                    </p>
                    <div style={styles.membershipPaymentActions}>
                      {payment.status === 'active' ? (
                        <>
                          <button
                            aria-label="Editar pago"
                            disabled={isSaving}
                            onClick={async () => {
                              const result = await Swal.fire({
                                title: `Editar pago de ${membership.name}`,
                                html: `
                                <label style="display:grid;gap:6px;text-align:left;margin-bottom:12px;">
                                  <span>Fecha efectiva</span>
                                  <input id="membership-paid-at" type="date" class="swal2-input" style="margin:0;" value="${payment.paid_at.slice(0, 10)}" />
                                </label>
                                <label style="display:grid;gap:6px;text-align:left;margin-bottom:12px;">
                                  <span>Periodo</span>
                                  <select id="membership-months-edit" class="swal2-input" style="margin:0;">
                                    <option value="1" ${payment.months_covered === 1 ? 'selected' : ''}>Mensual</option>
                                    <option value="3" ${payment.months_covered === 3 ? 'selected' : ''}>Trimestral</option>
                                    <option value="6" ${payment.months_covered === 6 ? 'selected' : ''}>Semestral</option>
                                    <option value="12" ${payment.months_covered === 12 ? 'selected' : ''}>Anual</option>
                                  </select>
                                </label>
                                <label style="display:grid;gap:6px;text-align:left;margin-bottom:12px;">
                                  <span>Monto total</span>
                                  <input id="membership-amount-edit" class="swal2-input" style="margin:0;" value="${payment.amount ?? ''}" />
                                </label>
                                <label style="display:grid;gap:6px;text-align:left;">
                                  <span>Nota</span>
                                  <input id="membership-notes-edit" class="swal2-input" style="margin:0;" value="${payment.notes ?? ''}" />
                                </label>
                              `,
                                focusConfirm: false,
                                showCancelButton: true,
                                confirmButtonText: 'Guardar cambios',
                                cancelButtonText: 'Cancelar',
                                preConfirm: () => {
                                  const paidAtValue =
                                    (document.getElementById('membership-paid-at') as HTMLInputElement | null)?.value ?? '';
                                  const monthsValue =
                                    (document.getElementById('membership-months-edit') as HTMLSelectElement | null)?.value ?? '1';
                                  const amountValue =
                                    (document.getElementById('membership-amount-edit') as HTMLInputElement | null)?.value.trim() ?? '';
                                  const notesValue =
                                    (document.getElementById('membership-notes-edit') as HTMLInputElement | null)?.value.trim() ?? '';
                                  const monthsCovered = Number(monthsValue);

                                  if (!paidAtValue) {
                                    Swal.showValidationMessage('Indica la fecha efectiva del pago.');
                                    return undefined;
                                  }

                                  if (![1, 3, 6, 12].includes(monthsCovered)) {
                                    Swal.showValidationMessage('Elegi un periodo valido.');
                                    return undefined;
                                  }

                                  if (amountValue && Number.isNaN(Number(amountValue))) {
                                    Swal.showValidationMessage('El monto debe ser numerico.');
                                    return undefined;
                                  }

                                  return {
                                    paid_at: paidAtValue,
                                    amount: amountValue || null,
                                    months_covered: monthsCovered,
                                    notes: notesValue || null,
                                  };
                                },
                              });

                              if (result.isConfirmed && result.value) {
                                onUpdateMembershipPayment(membership, payment, result.value);
                              }
                            }}
                            style={styles.iconActionButton}
                            title="Editar pago"
                            type="button"
                          >
                            <Pencil aria-hidden="true" size={15} strokeWidth={2.2} />
                          </button>
                          <button
                            aria-label="Anular pago"
                            disabled={isSaving}
                            onClick={async () => {
                              const result = await Swal.fire({
                                title: `Anular pago de ${membership.name}`,
                                html: `
                                <label style="display:grid;gap:6px;text-align:left;">
                                  <span>Motivo de anulacion</span>
                                  <input id="membership-cancel-reason" class="swal2-input" style="margin:0;" placeholder="Error de carga, pago duplicado, etc." />
                                </label>
                              `,
                                focusConfirm: false,
                                showCancelButton: true,
                                confirmButtonText: 'Anular pago',
                                cancelButtonText: 'Cancelar',
                                confirmButtonColor: '#ef4444',
                                preConfirm: () => {
                                  const reasonValue =
                                    (document.getElementById('membership-cancel-reason') as HTMLInputElement | null)?.value.trim() ?? '';
                                  if (reasonValue.length < 3) {
                                    Swal.showValidationMessage('Indica un motivo valido.');
                                    return undefined;
                                  }

                                  return { reason: reasonValue };
                                },
                              });

                              if (result.isConfirmed && result.value) {
                                onCancelMembershipPayment(membership, payment, result.value);
                              }
                            }}
                            style={styles.iconDangerButton}
                            title="Anular pago"
                            type="button"
                          >
                            <Trash2 aria-hidden="true" size={15} strokeWidth={2.2} />
                          </button>
                        </>
                      ) : null}
                      {payment.status === 'active' && payment.quote_id ? (
                        <>
                          <button
                            aria-label="Enviar por WhatsApp"
                            onClick={() => onSendMembershipQuoteByWhatsApp(payment)}
                            style={styles.whatsAppIconButton}
                            title="Enviar por WhatsApp"
                            type="button"
                          >
                            <MessageCircle aria-hidden="true" size={16} strokeWidth={2.2} />
                          </button>
                          <button
                            onClick={() => onSendMembershipQuoteByEmail(payment)}
                            style={styles.secondaryButton}
                            title="Enviar por Email"
                            type="button"
                          >
                            <span style={styles.buttonWithIcon}>
                              <Mail aria-hidden="true" size={14} strokeWidth={2.2} />
                              <span>Email</span>
                            </span>
                          </button>
                        </>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
      </section>
    </>
  );
}

function ChartPanel({
  emptyText,
  rows,
  title,
  valueFormatter,
}: {
  emptyText: string;
  rows: Array<{ label: string; value: number; secondary?: string }>;
  title: string;
  valueFormatter: (value: number) => string;
}) {
  const maxValue = Math.max(...rows.map((row) => row.value), 0);

  return (
    <section style={styles.tablePanel} aria-label={title}>
      <div style={styles.panelHeader}>
        <h2 style={styles.panelTitle}>{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p style={styles.emptyState}>{emptyText}</p>
      ) : (
        <div style={styles.chartList}>
          {rows.map((row) => {
            const width = maxValue ? Math.max((row.value / maxValue) * 100, 4) : 0;

            return (
              <div key={row.label} style={styles.chartRow}>
                <div style={styles.chartLabelRow}>
                  <strong>{row.label}</strong>
                  <span>{valueFormatter(row.value)}</span>
                </div>
                {row.secondary ? <p style={styles.chartSecondary}>{row.secondary}</p> : null}
                <div style={styles.chartTrack}>
                  <span style={{ ...styles.chartBar, width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DataTable({
  headers,
  isCompactLayout = false,
  rows,
}: {
  headers: string[];
  isCompactLayout?: boolean;
  rows: string[][];
}) {
  if (isCompactLayout) {
    return (
      <div style={styles.mobileDataList}>
        {rows.map((row) => (
          <article key={row.join('-')} style={styles.mobileDataCard}>
            <strong>{row[0]}</strong>
            {row.slice(1).map((cell, index) => (
              <div key={`${headers[index + 1]}-${cell}`} style={styles.mobileDataRow}>
                <span>{headers[index + 1]}</span>
                <b>{cell}</b>
              </div>
            ))}
          </article>
        ))}
      </div>
    );
  }

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          {headers.map((header, index) => (
            <th key={header} style={index === headers.length - 1 ? styles.thRight : styles.th}>
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.join('-')}>
            {row.map((cell, index) => (
              <td key={cell} style={index === row.length - 1 ? styles.tdRight : styles.td}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatusBadge({ status }: { status: QuoteStatus }) {
  return <span style={{ ...styles.statusBadge, ...statusBadgeStyle(status) }}>{statusLabels[status]}</span>;
}

function CategoryBadge({ category }: { category: CostCategory }) {
  return <span style={styles.categoryBadge}>{categoryLabels[category]}</span>;
}

function QuoteProgress({ quote }: { quote: Quote }) {
  const steps = [
    { key: 'client', label: 'Cliente', isDone: true },
    { key: 'items', label: 'Items', isDone: quote.items.length > 0 },
    {
      key: 'issued',
      label: quote.status === 'rejected' ? 'Rechazado' : 'Emitido',
      isDone: quote.status !== 'draft',
    },
    {
      key: 'decision',
      label: quote.status === 'accepted' ? 'Aceptado' : 'Decision',
      isDone: quote.status === 'accepted' || quote.status === 'rejected',
    },
  ];

  return (
    <div style={styles.progressBar} aria-label="Progreso del presupuesto">
      {steps.map((step) => (
        <div key={step.key} style={styles.progressStep}>
          <span style={step.isDone ? styles.progressDotDone : styles.progressDot} />
          <span style={step.isDone ? styles.progressLabelDone : styles.progressLabel}>{step.label}</span>
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  onChange,
  value,
  ...inputProps
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
  return (
    <label style={styles.label}>
      {label}
      <input
        {...inputProps}
        onChange={(event) => onChange(event.target.value)}
        style={styles.input}
        value={value}
      />
    </label>
  );
}

function companyProfileToForm(profile: TenantProfile): CompanyProfileForm {
  return {
    name: profile.name,
    legal_name: profile.legal_name ?? '',
    tax_id: profile.tax_id ?? '',
    address: profile.address ?? '',
    phone: profile.phone ?? '',
    email: profile.email ?? '',
    website: profile.website ?? '',
    logo_url: profile.logo_url ?? '',
    invoice_notes: profile.invoice_notes ?? '',
    default_tax_rate: profile.default_tax_rate,
  };
}

function buildWhatsAppInvoiceMessage({
  clientName,
  companyName,
  quote,
}: {
  clientName?: string;
  companyName: string;
  quote: Quote;
}): string {
  const greeting = buenosAiresGreeting();

  return [
    `Hola ${clientName ?? ''}, ${greeting}.`,
    `Te enviamos adjunta la factura electronica correspondiente al presupuesto ${quote.number} de ${companyName}.`,
    `Total: ${formatMoney(quote.total)}.`,
    'Muchas gracias. Quedamos a disposicion por cualquier consulta.',
  ]
    .filter(Boolean)
    .join(' ');
}

function buildGreetingByBuenosAiresTime(date = new Date()): string {
  return buenosAiresGreeting(date);
}

function buenosAiresGreeting(date = new Date()): string {
  const timeParts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).formatToParts(date);
  const hour = Number(timeParts.find((part) => part.type === 'hour')?.value ?? '0');
  const minute = Number(timeParts.find((part) => part.type === 'minute')?.value ?? '0');
  const minutes = hour * 60 + minute;

  if (minutes >= 8 * 60 && minutes < 13 * 60) {
    return 'Buen dia';
  }

  if (minutes >= 13 * 60 && minutes < 19 * 60 + 30) {
    return 'Buenas tardes';
  }

  return 'Buenas noches';
}

function buildInvoiceHtml(quote: Quote, clients: Client[], profile: TenantProfile | null): string {
  const companyName = profile?.legal_name || profile?.name || 'Empresa';
  const client = clientName(clients, quote.client_id);
  const contactLine = [profile?.phone, profile?.email, profile?.website].filter(Boolean).join(' - ');
  const rows = quote.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(categoryLabels[item.category])}</td>
          <td class="right">${escapeHtml(item.quantity)}</td>
          <td class="right">${escapeHtml(formatMoney(item.unit_price))}</td>
          <td class="right">${escapeHtml(formatMoney(item.line_total))}</td>
        </tr>
      `,
    )
    .join('');

  return `
    <!doctype html>
    <html>
      <head>
        <title>Factura ${escapeHtml(quote.number)}</title>
        <style>
          body { color: #17202a; font-family: Arial, sans-serif; margin: 32px; }
          header { align-items: flex-start; border-bottom: 1px solid #d9e0e7; display: flex; justify-content: space-between; padding-bottom: 20px; }
          h1, h2, p { margin: 0; }
          h1 { font-size: 24px; }
          h2 { font-size: 18px; margin-bottom: 8px; }
          .muted { color: #526071; margin-top: 6px; }
          .logo { max-height: 72px; max-width: 180px; object-fit: contain; }
          .section { margin-top: 24px; }
          table { border-collapse: collapse; margin-top: 14px; width: 100%; }
          th { color: #526071; font-size: 12px; text-align: left; text-transform: uppercase; }
          th, td { border-bottom: 1px solid #edf1f5; padding: 10px 8px; }
          .right { text-align: right; }
          .totals { display: grid; gap: 8px; justify-content: end; margin-top: 18px; text-align: right; }
          .notes { background: #f8fafc; border: 1px solid #e5eaf0; border-radius: 6px; padding: 12px; }
        </style>
      </head>
      <body>
        <header>
          <div>
            <h1>${escapeHtml(companyName)}</h1>
            ${profile?.tax_id ? `<p class="muted">CUIT ${escapeHtml(profile.tax_id)}</p>` : ''}
            ${profile?.address ? `<p class="muted">${escapeHtml(profile.address)}</p>` : ''}
            ${contactLine ? `<p class="muted">${escapeHtml(contactLine)}</p>` : ''}
          </div>
          ${profile?.logo_url ? `<img alt="" class="logo" src="${escapeAttribute(profile.logo_url)}" />` : ''}
        </header>
        <section class="section">
          <h2>Factura</h2>
          <p class="muted">Presupuesto ${escapeHtml(quote.number)} - ${escapeHtml(formatDate(quote.issued_at ?? quote.created_at))}</p>
          <p class="muted">Cliente: ${escapeHtml(client)}</p>
        </section>
        <section class="section">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Categoria</th>
                <th class="right">Cantidad</th>
                <th class="right">Unitario</th>
                <th class="right">Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="totals">
            <span>Subtotal ${escapeHtml(formatMoney(quote.subtotal))}</span>
            <span>IVA ${escapeHtml(formatMoney(quote.tax_total))}</span>
            <strong>Total ${escapeHtml(formatMoney(quote.total))}</strong>
          </div>
        </section>
        ${
          profile?.invoice_notes
            ? `<section class="section notes">${escapeHtml(profile.invoice_notes)}</section>`
            : ''
        }
      </body>
    </html>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll('`', '&#096;');
}

function compactPayload(form: ClientForm): ClientPayload {
  return {
    name: form.name.trim(),
    document: nullable(form.document),
    email: nullable(form.email),
    phone: nullable(form.phone),
    address: nullable(form.address),
    notes: nullable(form.notes),
  };
}

function clientName(clients: Client[], clientId: string): string {
  return clients.find((client) => client.id === clientId)?.name ?? 'Cliente';
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function openWhatsAppMessage(phone: string, message: string): void {
  const target = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  window.open(target, '_blank', 'noopener,noreferrer');
}

function openMailTo(email: string, subject: string, body: string): void {
  const target = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = target;
}

function matchesSearch(values: Array<string | null>, search: string): boolean {
  const term = search.trim().toLowerCase();

  if (!term) {
    return true;
  }

  return values.some((value) => value?.toLowerCase().includes(term));
}

function sumQuotes(quotes: Quote[], status?: QuoteStatus): number {
  return quotes.reduce((total, quote) => {
    if (status && quote.status !== status) {
      return total;
    }

    return total + Number(quote.total);
  }, 0);
}

function quoteTimestamp(quote: Quote): number {
  return new Date(quote.issued_at ?? quote.created_at).getTime();
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

function buildSmartTreasury(acceptedQuotes: Quote[], allQuotes: Quote[]) {
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
  const acceptedCount = acceptedQuotes.length;

  return {
    cards: [
      { label: 'Presupuestos aceptados', value: String(acceptedCount) },
      { label: 'Facturacion aceptada', value: formatMoney(totalAccepted) },
      { label: 'Ticket promedio', value: formatMoney(averageTicket) },
      { label: 'Conversion', value: `${conversionRate.toFixed(0)}%` },
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
    ],
    membershipsByMonth,
    months,
  };
}

function countByStatus<T extends { status: string }>(items: T[]) {
  return items.reduce<Record<string, number>>((totals, item) => {
    totals[item.status] = (totals[item.status] ?? 0) + 1;
    return totals;
  }, {});
}

function formatMonthsCovered(value: number): string {
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

function formatMonth(value: string): string {
  const [year, month] = value.split('-').map(Number);

  return new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatMoney(value: number | string): string {
  return new Intl.NumberFormat('es-AR', {
    currency: 'ARS',
    style: 'currency',
  }).format(Number(value));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function daysUntilDate(dateValue: string, now = new Date()): number {
  const target = new Date(`${dateValue}T00:00:00`);
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((target.getTime() - current.getTime()) / 86400000);
}

function buildPlatformNotifications(
  signupRequests: TenantSignupRequest[],
  changeRequests: TenantChangeRequest[],
  memberships: PlatformTenantMembership[],
  now = new Date(),
): PlatformNotification[] {
  const signupItems = signupRequests
    .filter((request) => request.status === 'pending')
    .map((request) => ({
      id: `signup-${request.id}`,
      kind: 'signup' as const,
      title: request.company_name,
      description: `${request.contact_name} - ${request.phone}`,
      actionLabel: 'Revisar solicitud' as const,
    }));

  const changeItems = changeRequests
    .filter((request) => request.status === 'pending')
    .map((request) => ({
      id: `change-${request.id}`,
      kind: 'change_request' as const,
      title: request.current_name ?? 'Cambio fiscal pendiente',
      description: request.reason ?? 'Pendiente de revision',
      actionLabel: 'Ver cambio' as const,
    }));

  const membershipItems = memberships
    .filter((membership) => {
      if (!membership.membership_due_date) {
        return false;
      }

      return daysUntilDate(membership.membership_due_date, now) <= 3;
    })
    .map((membership) => {
      const days = membership.membership_due_date
        ? daysUntilDate(membership.membership_due_date, now)
        : null;

      return {
        id: `membership-${membership.id}`,
        kind: 'membership' as const,
        title: membership.name,
        description:
          days !== null && days < 0
            ? 'Membresia vencida'
            : `Vence en ${days} dia${days === 1 ? '' : 's'}`,
        actionLabel: 'Registrar pago' as const,
      };
    });

  return [...signupItems, ...changeItems, ...membershipItems];
}

function navStyle(isActive: boolean): React.CSSProperties {
  return isActive ? styles.navActive : styles.navItem;
}

function showSuccessToast(title: string) {
  try {
    void Swal.fire({
      icon: 'success',
      position: 'top-end',
      showConfirmButton: false,
      timer: 2200,
      timerProgressBar: true,
      title,
      toast: true,
    });
  } catch {
    // SweetAlert2 can throw in headless test environments; runtime UI remains unaffected.
  }
}

function quoteTransitionSuccessMessage(action: 'issue' | 'accept' | 'reject'): string {
  if (action === 'issue') {
    return 'Presupuesto emitido';
  }

  if (action === 'accept') {
    return 'Presupuesto aceptado';
  }

  return 'Presupuesto rechazado';
}

function statusBadgeStyle(status: QuoteStatus): React.CSSProperties {
  if (status === 'accepted') {
    return styles.statusAccepted;
  }

  if (status === 'issued') {
    return styles.statusIssued;
  }

  if (status === 'rejected') {
    return styles.statusRejected;
  }

  return styles.statusDraft;
}

function bottomTabIcon(view: View): string {
  const icons: Record<View, string> = {
    clients: 'C',
    company: 'E',
    costs: 'S',
    platform: 'A',
    quotes: 'P',
    summary: 'I',
    treasury: 'T',
  };

  return icons[view];
}

function themeVariables(isDarkMode: boolean): React.CSSProperties {
  if (!isDarkMode) {
    return {
      '--accent': '#1d4ed8',
      '--accent-contrast': '#ffffff',
      '--accent-soft': '#eaf1ff',
      '--border': '#d9e0e7',
      '--danger': '#be123c',
      '--danger-bg': '#fff1f2',
      '--input-bg': '#ffffff',
      '--muted': '#526071',
      '--page-bg': '#f4f6f8',
      '--panel-bg': '#ffffff',
      '--panel-subtle': '#f8fafc',
      '--success': '#027a48',
      '--success-bg': '#ecfdf3',
      '--text': '#17202a',
      '--warning': '#b45309',
      '--warning-bg': '#fffbeb',
    } as React.CSSProperties;
  }

  return {
    '--accent': '#daa520',
    '--accent-contrast': '#09090b',
    '--accent-soft': 'rgba(218, 165, 32, 0.16)',
    '--border': 'rgba(218, 165, 32, 0.28)',
    '--danger': '#fb7185',
    '--danger-bg': 'rgba(244, 63, 94, 0.16)',
    '--input-bg': '#111827',
    '--muted': '#a7b0c0',
    '--page-bg': '#07070c',
    '--panel-bg': '#0e1118',
    '--panel-subtle': '#151a24',
    '--success': '#34d399',
    '--success-bg': 'rgba(52, 211, 153, 0.14)',
    '--text': '#f8fafc',
    '--warning': '#fbbf24',
    '--warning-bg': 'rgba(251, 191, 36, 0.14)',
  } as React.CSSProperties;
}

const styles = {
  page: {
    background:
      'radial-gradient(circle at 18% 10%, rgba(218, 165, 32, 0.16), transparent 28%), linear-gradient(135deg, var(--page-bg), var(--page-bg))',
    color: 'var(--text)',
    display: 'flex',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    minHeight: '100vh',
    minWidth: 0,
  },
  pageCompact: {
    display: 'block',
  },
  sidebar: {
    background: 'var(--panel-bg)',
    borderRight: '1px solid var(--border)',
    boxSizing: 'border-box',
    flex: '0 0 248px',
    overflow: 'hidden',
    padding: '24px',
    transition: 'flex-basis 220ms ease, width 220ms ease, padding 220ms ease, border-color 220ms ease',
    width: '248px',
  },
  sidebarCollapsed: {
    flex: '0 0 92px',
    padding: '20px 14px',
    width: '92px',
  },
  mobileHeader: {
    alignItems: 'center',
    background: 'var(--panel-bg)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 14px',
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },
  mobileBrand: {
    alignItems: 'center',
    display: 'flex',
    gap: '10px',
    minWidth: 0,
  },
  mobileBrandText: {
    display: 'grid',
    gap: '2px',
    minWidth: 0,
  },
  mobileHeaderActions: {
    alignItems: 'center',
    display: 'flex',
    gap: '8px',
  },
  mobileCurrentView: {
    color: 'var(--muted)',
    display: 'block',
    fontSize: '12px',
    fontWeight: 700,
    lineHeight: 1.1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  mobileLogo: {
    borderRadius: '6px',
    display: 'block',
    height: '44px',
    objectFit: 'contain',
    width: '44px',
  },
  hamburgerButton: {
    alignItems: 'center',
    background: 'var(--panel-subtle)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    cursor: 'pointer',
    display: 'grid',
    gap: '4px',
    height: '42px',
    justifyContent: 'center',
    padding: '0 10px',
    width: '46px',
  },
  hamburgerGlyph: {
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: 0,
    lineHeight: 1,
  },
  mobileDrawerOverlay: {
    alignItems: 'flex-start',
    background: 'rgba(0, 0, 0, 0.48)',
    bottom: 0,
    display: 'flex',
    left: 0,
    padding: '12px',
    position: 'fixed',
    right: 0,
    top: 0,
    zIndex: 40,
  },
  mobileDrawer: {
    background: 'var(--panel-bg)',
    borderRight: '1px solid var(--border)',
    borderRadius: '10px',
    boxShadow: '18px 0 44px rgba(0, 0, 0, 0.35)',
    display: 'grid',
    gap: '12px',
    gridTemplateRows: 'auto auto auto',
    maxHeight: 'calc(100dvh - 24px)',
    maxWidth: '300px',
    overflowY: 'auto',
    padding: '18px',
    width: 'min(82vw, 300px)',
  },
  mobileDrawerHeader: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  },
  mobileDrawerNav: {
    display: 'grid',
    gap: '8px',
  },
  mobileDrawerNavButton: {
    minHeight: '44px',
    width: '100%',
  },
  mobileDrawerActions: {
    display: 'grid',
    gap: '10px',
    marginTop: '8px',
  },
  logoRow: {
    alignItems: 'center',
    display: 'flex',
    gap: '10px',
    marginBottom: '32px',
    minHeight: '64px',
    transition: 'gap 220ms ease, margin 220ms ease, min-height 220ms ease',
  },
  logoRowCollapsed: {
    display: 'grid',
    gap: '12px',
    justifyItems: 'center',
    marginBottom: '24px',
    minHeight: '112px',
  },
  logoText: {
    fontSize: '15px',
    lineHeight: 1,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  sidebarToggle: {
    backgroundColor: 'var(--panel-subtle)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--text)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 800,
    marginLeft: 'auto',
    minHeight: '32px',
    minWidth: '32px',
    transition: 'background 180ms ease, border-color 180ms ease, color 180ms ease, transform 220ms ease',
  },
  sidebarToggleCollapsed: {
    marginLeft: 0,
  },
  logoMark: {
    borderRadius: '6px',
    display: 'block',
    flex: '0 0 64px',
    height: '64px',
    objectFit: 'contain',
    transition: 'height 220ms ease, width 220ms ease, flex-basis 220ms ease, transform 220ms ease',
    width: '64px',
  },
  logoMarkCollapsed: {
    flexBasis: '56px',
    height: '56px',
    width: '56px',
  },
  nav: {
    display: 'grid',
    gap: '6px',
  },
  navCompact: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '2px',
  },
  navItem: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    border: 0,
    borderRadius: '6px',
    color: 'var(--muted)',
    cursor: 'pointer',
    display: 'flex',
    fontSize: '14px',
    gap: '10px',
    minHeight: '42px',
    padding: '10px 12px',
    textAlign: 'left',
    transition:
      'background 180ms ease, color 180ms ease, padding 220ms ease, min-height 220ms ease, border-color 180ms ease',
    whiteSpace: 'nowrap',
  },
  navActive: {
    alignItems: 'center',
    backgroundColor: 'var(--accent-soft)',
    border: 0,
    borderRadius: '6px',
    color: 'var(--accent)',
    cursor: 'pointer',
    display: 'flex',
    fontSize: '14px',
    gap: '10px',
    fontWeight: 700,
    minHeight: '42px',
    padding: '10px 12px',
    textAlign: 'left',
    transition:
      'background 180ms ease, color 180ms ease, padding 220ms ease, min-height 220ms ease, border-color 180ms ease',
    whiteSpace: 'nowrap',
  },
  navItemCollapsed: {
    justifyContent: 'center',
    minHeight: '50px',
    padding: '8px 6px',
    textAlign: 'center',
  },
  navMonogram: {
    alignItems: 'center',
    background: 'var(--panel-subtle)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--muted)',
    display: 'inline-grid',
    flex: '0 0 28px',
    fontSize: '11px',
    fontWeight: 900,
    height: '28px',
    justifyContent: 'center',
    letterSpacing: 0,
    lineHeight: 1,
    transition:
      'background 180ms ease, border-color 180ms ease, color 180ms ease, height 220ms ease, width 220ms ease, flex-basis 220ms ease',
    width: '28px',
  },
  navMonogramActive: {
    background: 'var(--accent)',
    border: '1px solid var(--accent)',
    color: '#111827',
  },
  navMonogramCollapsed: {
    flexBasis: '42px',
    fontSize: '13px',
    height: '42px',
    width: '42px',
  },
  navLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  content: {
    flex: 1,
    minWidth: 0,
    padding: 'clamp(20px, 3vw, 32px)',
    transition: 'padding 220ms ease',
  },
  contentCompact: {
    overflowX: 'hidden',
    padding: '14px 14px 108px',
  },
  topbarMobileHidden: {
    display: 'none',
  },
  topbar: {
    alignItems: 'center',
    display: 'flex',
    gap: '16px',
    justifyContent: 'space-between',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  topbarActions: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  notificationButton: {
    alignItems: 'center',
    background: 'var(--panel-bg)',
    border: '1px solid var(--border)',
    borderRadius: '999px',
    color: 'var(--text)',
    cursor: 'pointer',
    display: 'inline-flex',
    gap: '8px',
    minHeight: '40px',
    padding: '8px 12px',
    position: 'relative',
  },
  notificationGlyph: {
    fontSize: '12px',
    fontWeight: 800,
    lineHeight: 1,
  },
  notificationBadge: {
    alignItems: 'center',
    background: 'var(--accent)',
    borderRadius: '999px',
    color: 'var(--accent-contrast)',
    display: 'inline-flex',
    fontSize: '12px',
    fontWeight: 800,
    justifyContent: 'center',
    minWidth: '22px',
    padding: '2px 6px',
  },
  notificationPanel: {
    background: 'var(--panel-bg)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    display: 'grid',
    gap: '14px',
    marginBottom: '18px',
    padding: '16px',
  },
  notificationSection: {
    display: 'grid',
    gap: '10px',
  },
  notificationItem: {
    background: 'var(--panel-subtle)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    display: 'grid',
    gap: '6px',
    padding: '12px',
  },
  platformWorkspace: {
    display: 'grid',
    gap: '18px',
  },
  platformWorkspaceHeader: {
    alignItems: 'flex-start',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '14px',
    justifyContent: 'space-between',
  },
  platformSectionNav: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  platformSectionButton: {
    backgroundColor: 'var(--panel-bg)',
    border: '1px solid var(--border)',
    borderRadius: '999px',
    color: 'var(--muted)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 700,
    minHeight: '38px',
    padding: '8px 14px',
  },
  platformSectionButtonActive: {
    backgroundColor: 'var(--accent-soft)',
    border: '1px solid var(--accent)',
    borderRadius: '999px',
    color: 'var(--accent)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 800,
    minHeight: '38px',
    padding: '8px 14px',
  },
  platformSelectField: {
    display: 'grid',
    gap: '6px',
    minWidth: '220px',
  },
  labelCaption: {
    color: 'var(--muted)',
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  select: {
    background: 'var(--input-bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    font: 'inherit',
    minHeight: '42px',
    padding: '10px 11px',
  },
  platformImmediateList: {
    display: 'grid',
    gap: '16px',
  },
  platformImmediatePanel: {
    background: 'var(--panel-subtle)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    display: 'grid',
    gap: '10px',
    padding: '16px',
  },
  platformImmediateTitle: {
    fontSize: '18px',
    margin: 0,
  },
  platformImmediateItem: {
    background: 'var(--panel-bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    cursor: 'pointer',
    display: 'grid',
    gap: '4px',
    padding: '12px',
    textAlign: 'left',
  },
  platformFilterBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '14px',
  },
  platformFilterStack: {
    display: 'grid',
    gap: '4px',
  },
  platformFilterButton: {
    background: 'var(--panel-bg)',
    border: '1px solid var(--border)',
    borderRadius: '999px',
    color: 'var(--muted)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 700,
    minHeight: '36px',
    padding: '6px 12px',
  },
  platformFilterButtonActive: {
    background: 'var(--accent-soft)',
    border: '1px solid var(--accent)',
    borderRadius: '999px',
    color: 'var(--accent)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 800,
    minHeight: '36px',
    padding: '6px 12px',
  },
  platformMembershipCard: {
    background: 'var(--panel-subtle)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    display: 'grid',
    gap: '12px',
    padding: '14px',
  },
  platformMembershipActions: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  platformMembershipMeta: {
    color: 'var(--muted)',
    fontSize: '12px',
    fontWeight: 600,
  },
  buttonWithIcon: {
    alignItems: 'center',
    display: 'inline-flex',
    gap: '8px',
  },
  title: {
    fontSize: '28px',
    lineHeight: 1.15,
    margin: 0,
  },
  subtitle: {
    color: 'var(--muted)',
    fontSize: '15px',
    margin: '8px 0 0',
  },
  bottomTabBar: {
    background: 'var(--panel-bg)',
    borderTop: '1px solid var(--border)',
    bottom: 0,
    display: 'grid',
    gap: '4px',
    gridTemplateColumns: 'repeat(4, 1fr)',
    left: 0,
    padding: '8px 8px 10px',
    position: 'fixed',
    right: 0,
    zIndex: 30,
  },
  bottomTab: {
    alignItems: 'center',
    background: 'transparent',
    border: 0,
    borderRadius: '8px',
    color: 'var(--muted)',
    cursor: 'pointer',
    display: 'grid',
    fontSize: '11px',
    fontWeight: 700,
    gap: '3px',
    justifyItems: 'center',
    minHeight: '48px',
  },
  bottomTabActive: {
    alignItems: 'center',
    background: 'var(--accent-soft)',
    border: 0,
    borderRadius: '8px',
    color: 'var(--accent)',
    cursor: 'pointer',
    display: 'grid',
    fontSize: '11px',
    fontWeight: 800,
    gap: '3px',
    justifyItems: 'center',
    minHeight: '48px',
  },
  errorBanner: {
    background: 'var(--danger-bg)',
    border: '1px solid var(--danger)',
    borderRadius: '8px',
    color: 'var(--danger)',
    margin: '0 0 20px',
    padding: '12px 14px',
  },
  secondaryButton: {
    backgroundColor: 'var(--panel-bg)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--text)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
    padding: '10px 14px',
  },
  secondaryButtonActive: {
    backgroundColor: 'var(--accent-soft)',
    border: '1px solid var(--accent)',
    borderRadius: '6px',
    color: 'var(--text)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
    padding: '10px 14px',
  },
  primaryButton: {
    backgroundColor: 'var(--accent)',
    border: 0,
    borderRadius: '6px',
    color: 'var(--accent-contrast)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
    padding: '10px 14px',
  },
  metrics: {
    display: 'grid',
    gap: '12px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))',
    marginBottom: '24px',
  },
  metricCard: {
    background: 'var(--panel-bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    minWidth: 0,
    overflow: 'hidden',
    padding: 'clamp(14px, 3vw, 20px)',
  },
  metricLabel: {
    color: 'var(--muted)',
    fontSize: '13px',
    fontWeight: 700,
    margin: 0,
    textTransform: 'uppercase',
  },
  metricValue: {
    display: 'block',
    fontSize: 'clamp(22px, 6vw, 30px)',
    lineHeight: 1.1,
    marginTop: '10px',
    overflowWrap: 'anywhere',
  },
  gridTwo: {
    display: 'grid',
    gap: '20px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
    marginBottom: '20px',
  },
  workspaceGrid: {
    display: 'grid',
    gap: '20px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
  },
  profileGrid: {
    display: 'grid',
    gap: '20px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
  },
  companyWorkspace: {
    display: 'grid',
    gap: '18px',
  },
  companyWorkspaceHeader: {
    alignItems: 'flex-start',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '14px',
    justifyContent: 'space-between',
  },
  formGridTwo: {
    display: 'grid',
    gap: '12px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  },
  presetGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  formPanel: {
    alignSelf: 'start',
    background: 'var(--panel-bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    display: 'grid',
    gap: '14px',
    padding: '20px',
  },
  companyLogoCard: {
    alignItems: 'center',
    background: 'var(--panel-subtle)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    display: 'grid',
    gap: '16px',
    gridTemplateColumns: 'minmax(96px, 128px) minmax(0, 1fr)',
    padding: '16px',
  },
  companyLogoPreviewFrame: {
    alignItems: 'center',
    background: 'var(--panel-bg)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    display: 'flex',
    height: '120px',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: '10px',
    width: '120px',
  },
  companyLogoPreviewImage: {
    display: 'block',
    height: '100%',
    objectFit: 'contain',
    width: '100%',
  },
  companyLogoInfo: {
    display: 'grid',
    gap: '8px',
  },
  tablePanel: {
    background: 'var(--panel-bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    minWidth: 0,
    overflowX: 'auto',
  },
  panelHeader: {
    alignItems: 'center',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    justifyContent: 'space-between',
    padding: '18px 20px',
  },
  panelHeaderCompact: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  },
  smartHeader: {
    alignItems: 'center',
    background: 'var(--panel-bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    justifyContent: 'space-between',
    marginBottom: '16px',
    padding: '18px 20px',
  },
  panelTitle: {
    fontSize: '18px',
    margin: 0,
  },
  table: {
    borderCollapse: 'collapse',
    minWidth: '680px',
    width: '100%',
  },
  th: {
    color: 'var(--muted)',
    fontSize: '12px',
    padding: '12px 20px',
    textAlign: 'left',
    textTransform: 'uppercase',
  },
  thRight: {
    color: 'var(--muted)',
    fontSize: '12px',
    padding: '12px 20px',
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  td: {
    borderTop: '1px solid var(--border)',
    fontSize: '14px',
    padding: '14px 20px',
    verticalAlign: 'top',
  },
  tdRight: {
    borderTop: '1px solid var(--border)',
    fontSize: '14px',
    fontWeight: 700,
    padding: '14px 20px',
    textAlign: 'right',
    verticalAlign: 'top',
  },
  mobileDataList: {
    display: 'grid',
    gap: '10px',
    padding: '12px',
  },
  mobileDataCard: {
    background: 'var(--panel-subtle)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    display: 'grid',
    gap: '8px',
    minWidth: 0,
    padding: '12px',
  },
  mobileDataRow: {
    alignItems: 'start',
    borderTop: '1px solid var(--border)',
    display: 'grid',
    gap: '8px',
    gridTemplateColumns: 'minmax(84px, 0.8fr) minmax(0, 1.2fr)',
    overflowWrap: 'anywhere',
    paddingTop: '8px',
  },
  label: {
    color: 'var(--text)',
    display: 'grid',
    fontSize: '14px',
    fontWeight: 600,
    gap: '7px',
  },
  input: {
    background: 'var(--input-bg)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--text)',
    font: 'inherit',
    padding: '10px 11px',
  },
  textarea: {
    background: 'var(--input-bg)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--text)',
    font: 'inherit',
    padding: '10px 11px',
    resize: 'vertical',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginTop: '4px',
  },
  linkButton: {
    background: 'transparent',
    border: 0,
    color: 'var(--accent)',
    cursor: 'pointer',
    font: 'inherit',
    fontWeight: 700,
    marginRight: '10px',
    padding: 0,
  },
  whatsAppButton: {
    background: 'rgba(37, 211, 102, 0.14)',
    border: '1px solid rgba(37, 211, 102, 0.5)',
    borderRadius: '999px',
    color: '#25d366',
    cursor: 'pointer',
    font: 'inherit',
    fontWeight: 800,
    padding: '6px 10px',
  },
  whatsAppIconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(37, 211, 102, 0.14)',
    border: '1px solid rgba(37, 211, 102, 0.42)',
    borderRadius: '8px',
    color: '#25d366',
    cursor: 'pointer',
    display: 'inline-flex',
    height: '36px',
    justifyContent: 'center',
    width: '36px',
  },
  dangerButton: {
    background: 'transparent',
    border: 0,
    color: 'var(--danger)',
    cursor: 'pointer',
    font: 'inherit',
    fontWeight: 700,
    padding: 0,
  },
  iconActionButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--accent)',
    cursor: 'pointer',
    display: 'inline-flex',
    height: '34px',
    justifyContent: 'center',
    width: '34px',
  },
  iconDangerButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    border: '1px solid rgba(239, 68, 68, 0.5)',
    borderRadius: '8px',
    color: 'var(--danger)',
    cursor: 'pointer',
    display: 'inline-flex',
    height: '34px',
    justifyContent: 'center',
    width: '34px',
  },
  dangerOutlineButton: {
    background: 'transparent',
    border: '1px solid var(--danger)',
    borderRadius: '6px',
    color: 'var(--danger)',
    cursor: 'pointer',
    font: 'inherit',
    fontWeight: 700,
    padding: '10px 14px',
  },
  emptyState: {
    color: 'var(--muted)',
    margin: 0,
    padding: '24px 20px',
  },
  clientList: {
    display: 'grid',
    gap: '8px',
    padding: '12px',
  },
  clientRow: {
    alignItems: 'center',
    background: 'var(--panel-subtle)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    display: 'grid',
    gap: '14px',
    gridTemplateColumns: 'minmax(140px, 1fr) minmax(180px, 1.1fr) minmax(110px, auto) auto',
    padding: '14px 16px',
  },
  clientRowButton: {
    alignItems: 'center',
    background: 'transparent',
    border: 0,
    color: 'var(--text)',
    cursor: 'pointer',
    display: 'grid',
    gap: '14px',
    gridTemplateColumns: 'minmax(140px, 1fr) minmax(180px, 1.1fr) minmax(110px, auto)',
    minWidth: 0,
    padding: 0,
    textAlign: 'left',
  },
  clientIdentity: {
    display: 'grid',
    gap: '4px',
    minWidth: 0,
  },
  clientContact: {
    display: 'grid',
    gap: '4px',
    minWidth: 0,
    overflowWrap: 'anywhere',
  },
  clientContactLine: {
    alignItems: 'center',
    display: 'inline-flex',
    gap: '8px',
  },
  clientContactLineMuted: {
    alignItems: 'center',
    color: 'var(--muted)',
    display: 'inline-flex',
    fontSize: '13px',
    gap: '8px',
  },
  clientMetaStack: {
    alignItems: 'start',
    display: 'grid',
    gap: '6px',
    justifyItems: 'start',
  },
  clientMetaPill: {
    background: 'var(--panel-bg)',
    border: '1px solid var(--border)',
    borderRadius: '999px',
    color: 'var(--text)',
    display: 'inline-flex',
    fontSize: '12px',
    fontWeight: 700,
    lineHeight: 1,
    padding: '6px 10px',
    whiteSpace: 'nowrap',
  },
  clientActions: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    justifyContent: 'flex-end',
  },
  clientRecordShell: {
    display: 'grid',
    gap: '16px',
    padding: '16px 20px 20px',
  },
  clientOverviewBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  compactEmpty: {
    color: 'var(--muted)',
    fontSize: '14px',
    margin: 0,
  },
  categoryGrid: {
    display: 'grid',
    gap: '12px',
    padding: '20px',
  },
  categoryRow: {
    alignItems: 'center',
    background: 'var(--panel-subtle)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    display: 'flex',
    gap: '10px',
    justifyContent: 'space-between',
    padding: '13px 15px',
  },
  panelSubtitle: {
    color: 'var(--muted)',
    fontSize: '13px',
    margin: '4px 0 0',
  },
  sideStack: {
    display: 'grid',
    gap: '20px',
  },
  serviceForm: {
    display: 'grid',
    gap: '12px',
  },
  serviceList: {
    display: 'grid',
    gap: '10px',
  },
  historyBlock: {
    borderTop: '1px solid var(--border)',
    display: 'grid',
    gap: '12px',
    paddingTop: '14px',
  },
  historyQuoteRecord: {
    background: 'var(--panel-subtle)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    display: 'grid',
    gap: '8px',
    padding: '12px',
  },
  historyRecordHeader: {
    alignItems: 'start',
    display: 'flex',
    gap: '10px',
    justifyContent: 'space-between',
  },
  lockedFiscalPanel: {
    background: 'var(--panel-subtle)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    display: 'grid',
    gap: '12px',
    padding: '14px',
  },
  lockedFiscalGrid: {
    color: 'var(--muted)',
    display: 'grid',
    fontSize: '13px',
    gap: '6px',
  },
  treasuryMovementRow: {
    alignItems: 'center',
    background: 'var(--panel-subtle)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    display: 'grid',
    gap: '14px',
    gridTemplateColumns: 'minmax(180px, 1fr) auto auto auto',
    padding: '14px 16px',
  },
  treasuryOverviewStrip: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    padding: '14px 20px 0',
  },
  treasuryMovementPrimary: {
    display: 'grid',
    gap: '4px',
    minWidth: 0,
  },
  treasuryMovementMeta: {
    color: 'var(--muted)',
    fontSize: '13px',
    fontWeight: 600,
  },
  treasuryMovementAmount: {
    justifySelf: 'end',
    whiteSpace: 'nowrap',
  },
  treasuryActionGroup: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    justifyContent: 'flex-end',
  },
  invoicePreview: {
    display: 'grid',
    gap: '14px',
    padding: '20px',
  },
  logoPreview: {
    maxHeight: '72px',
    maxWidth: 'min(180px, 42vw)',
    objectFit: 'contain',
  },
  logoPlaceholder: {
    alignItems: 'center',
    background: 'var(--panel-subtle)',
    border: '1px dashed var(--border)',
    borderRadius: '8px',
    color: 'var(--muted)',
    display: 'flex',
    fontWeight: 700,
    height: '72px',
    justifyContent: 'center',
    maxWidth: '180px',
    width: '42vw',
  },
  invoiceCompanyName: {
    fontSize: '20px',
    margin: 0,
  },
  pdfPreviewShell: {
    background: 'var(--panel-subtle)',
    display: 'flex',
    justifyContent: 'center',
    minWidth: 0,
    overflowX: 'hidden',
    padding: 'clamp(10px, 3vw, 20px)',
  },
  pdfPreviewPage: {
    background: '#ffffff',
    borderRadius: '6px',
    boxSizing: 'border-box',
    boxShadow: '0 18px 45px rgba(0, 0, 0, 0.28)',
    color: '#17202a',
    display: 'grid',
    gap: 'clamp(12px, 3vw, 18px)',
    maxWidth: '680px',
    minHeight: '720px',
    minWidth: 0,
    overflow: 'hidden',
    padding: 'clamp(14px, 4vw, 28px)',
    width: '100%',
  },
  pdfPreviewHeader: {
    alignItems: 'start',
    borderBottom: '1px solid #d9e0e7',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    justifyContent: 'space-between',
    paddingBottom: '18px',
  },
  pdfPreviewMuted: {
    color: '#526071',
    fontSize: '13px',
    margin: '4px 0 0',
  },
  pdfPreviewMeta: {
    alignItems: 'start',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    justifyContent: 'space-between',
  },
  pdfPreviewClient: {
    display: 'grid',
    gap: '4px',
    minWidth: 0,
    textAlign: 'right',
  },
  pdfPreviewTable: {
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
    width: '100%',
  },
  pdfPreviewTh: {
    borderBottom: '1px solid #d9e0e7',
    color: '#526071',
    fontSize: 'clamp(10px, 2.7vw, 12px)',
    padding: '10px 6px',
    textAlign: 'left',
    textTransform: 'uppercase',
  },
  pdfPreviewThRight: {
    borderBottom: '1px solid #d9e0e7',
    color: '#526071',
    fontSize: 'clamp(10px, 2.7vw, 12px)',
    padding: '10px 6px',
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  pdfPreviewTd: {
    borderBottom: '1px solid #edf1f5',
    fontSize: 'clamp(12px, 3.2vw, 14px)',
    overflowWrap: 'anywhere',
    padding: '12px 6px',
  },
  pdfPreviewTdRight: {
    borderBottom: '1px solid #edf1f5',
    fontSize: 'clamp(12px, 3.2vw, 14px)',
    fontWeight: 700,
    overflowWrap: 'anywhere',
    padding: '12px 6px',
    textAlign: 'right',
  },
  pdfPreviewTotals: {
    alignItems: 'end',
    display: 'grid',
    gap: '7px',
    justifyContent: 'end',
    maxWidth: '100%',
    overflowWrap: 'anywhere',
    textAlign: 'right',
  },
  pdfPreviewNotes: {
    background: '#f8fafc',
    border: '1px solid #e5eaf0',
    borderRadius: '6px',
    color: '#526071',
    fontSize: '13px',
    margin: 0,
    padding: '12px',
  },
  serviceRecord: {
    background: 'var(--panel-subtle)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    display: 'grid',
    gap: '8px',
    padding: '12px',
  },
  serviceDescription: {
    color: 'var(--muted)',
    fontSize: '13px',
    lineHeight: 1.45,
    margin: 0,
  },
  quoteList: {
    display: 'grid',
    gap: '10px',
    padding: '12px',
  },
  quoteListButton: {
    backgroundColor: 'var(--panel-subtle)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    cursor: 'pointer',
    display: 'block',
    padding: '14px 16px',
    textAlign: 'left',
  },
  quoteListActive: {
    backgroundColor: 'var(--accent-soft)',
    border: '1px solid var(--accent)',
    borderRadius: '8px',
    color: 'var(--text)',
    cursor: 'pointer',
    display: 'block',
    padding: '14px 16px',
    textAlign: 'left',
  },
  quoteListCard: {
    alignItems: 'start',
    display: 'grid',
    gap: '16px',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
  },
  quoteRowMain: {
    display: 'grid',
    gap: '5px',
    minWidth: 0,
  },
  quoteListAside: {
    alignItems: 'end',
    display: 'grid',
    gap: '8px',
    justifyItems: 'end',
  },
  quoteNumber: {
    color: 'var(--muted)',
    fontSize: '13px',
    fontWeight: 700,
  },
  quoteTitleText: {
    color: 'var(--text)',
    fontSize: '13px',
    fontWeight: 600,
  },
  quoteEditorSection: {
    display: 'grid',
    gap: '18px',
    padding: '18px 20px 22px',
  },
  quoteEditorBlock: {
    background: 'var(--panel-subtle)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    display: 'grid',
    gap: '14px',
    padding: '18px',
  },
  quoteSummaryGrid: {
    display: 'grid',
    gap: '12px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  },
  quoteSummaryCard: {
    background: 'var(--panel-subtle)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    display: 'grid',
    gap: '6px',
    padding: '12px',
  },
  quoteSummaryLabel: {
    color: 'var(--muted)',
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  inlineForm: {
    alignItems: 'end',
    borderBottom: '1px solid var(--border)',
    display: 'grid',
    gap: '12px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    padding: '16px 20px',
  },
  catalogPicker: {
    borderBottom: '1px solid var(--border)',
    display: 'grid',
    gap: '12px',
    padding: '16px 20px',
  },
  compactTitle: {
    fontSize: '16px',
    margin: 0,
  },
  helperText: {
    color: 'var(--muted)',
    fontSize: '13px',
    lineHeight: 1.5,
    margin: '6px 0 0',
  },
  quoteCatalogSurface: {
    background: 'var(--panel-bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    display: 'grid',
    gap: '12px',
    padding: '14px',
  },
  catalogGrid: {
    display: 'grid',
    gap: '10px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  },
  catalogItemButton: {
    alignItems: 'center',
    background: 'var(--panel-bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    cursor: 'pointer',
    display: 'flex',
    gap: '10px',
    justifyContent: 'space-between',
    minHeight: '64px',
    padding: '12px 14px',
    textAlign: 'left',
  },
  catalogItemDescription: {
    color: 'var(--muted)',
    display: 'block',
    fontSize: '12px',
    fontWeight: 500,
    lineHeight: 1.3,
    marginTop: '3px',
  },
  catalogItemPrice: {
    color: 'var(--accent)',
    fontSize: '13px',
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },
  mutedText: {
    color: 'var(--muted)',
    fontSize: '13px',
  },
  membershipPaymentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '4px',
  },
  membershipPaymentRow: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  membershipPaymentChip: {
    background: 'var(--panel-subtle)',
    border: '1px solid var(--border)',
    borderRadius: '999px',
    color: 'var(--muted)',
    display: 'inline-flex',
    fontSize: '12px',
    padding: '5px 9px',
  },
  membershipPaymentActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  totals: {
    alignItems: 'center',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    justifyContent: 'flex-end',
    padding: '18px 0 0',
  },
  filterBar: {
    alignItems: 'end',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    gap: '12px',
    padding: '14px 20px',
  },
  quoteFilterBar: {
    borderBottom: '1px solid var(--border)',
    display: 'grid',
    gap: '10px',
    padding: '14px 20px',
  },
  compactLabel: {
    color: 'var(--muted)',
    display: 'grid',
    flex: 1,
    fontSize: '12px',
    fontWeight: 700,
    gap: '6px',
    textTransform: 'uppercase',
  },
  searchInput: {
    background: 'var(--input-bg)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--text)',
    font: 'inherit',
    fontSize: '14px',
    padding: '9px 10px',
    textTransform: 'none',
  },
  chartList: {
    display: 'grid',
    gap: '14px',
    padding: '18px 20px',
  },
  chartRow: {
    display: 'grid',
    gap: '7px',
  },
  chartLabelRow: {
    alignItems: 'center',
    display: 'flex',
    gap: '12px',
    justifyContent: 'space-between',
  },
  chartSecondary: {
    color: 'var(--muted)',
    fontSize: '12px',
    margin: 0,
  },
  chartTrack: {
    background: 'var(--panel-subtle)',
    border: '1px solid var(--border)',
    borderRadius: '999px',
    height: '12px',
    overflow: 'hidden',
  },
  chartBar: {
    background: 'linear-gradient(90deg, var(--accent), #25d366)',
    display: 'block',
    height: '100%',
  },
  smartReportGrid: {
    display: 'grid',
    gap: '12px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    padding: '18px 20px',
  },
  smartInsight: {
    background: 'var(--panel-subtle)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    display: 'grid',
    gap: '6px',
    lineHeight: 1.45,
    padding: '14px',
  },
  filterSelect: {
    background: 'var(--input-bg)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--text)',
    font: 'inherit',
    fontSize: '14px',
    minWidth: '130px',
    padding: '9px 10px',
    textTransform: 'none',
  },
  statusFilterRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  filterChip: {
    backgroundColor: 'var(--panel-bg)',
    border: '1px solid var(--border)',
    borderRadius: '999px',
    color: 'var(--text)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 700,
    padding: '6px 9px',
  },
  filterChipActive: {
    backgroundColor: 'var(--accent)',
    border: '1px solid var(--accent)',
    borderRadius: '999px',
    color: 'var(--accent-contrast)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 700,
    padding: '6px 9px',
  },
  statusBadge: {
    borderRadius: '999px',
    display: 'inline-flex',
    fontSize: '12px',
    fontWeight: 700,
    justifySelf: 'start',
    lineHeight: 1,
    padding: '6px 8px',
  },
  statusDraft: {
    background: 'var(--panel-subtle)',
    color: 'var(--muted)',
  },
  statusIssued: {
    background: 'var(--accent-soft)',
    color: 'var(--accent)',
  },
  statusAccepted: {
    background: 'var(--success-bg)',
    color: 'var(--success)',
  },
  statusRejected: {
    background: 'var(--danger-bg)',
    color: 'var(--danger)',
  },
  activeMembershipBadge: {
    background: 'var(--success-bg)',
    color: 'var(--success)',
  },
  expiredMembershipBadge: {
    background: 'var(--danger-bg)',
    color: 'var(--danger)',
  },
  historyAcceptedBadge: {
    background: 'var(--success-bg)',
    color: 'var(--success)',
  },
  historyRejectedBadge: {
    background: 'var(--danger-bg)',
    color: 'var(--danger)',
  },
  categoryBadge: {
    background: 'var(--panel-subtle)',
    border: '1px solid var(--border)',
    borderRadius: '999px',
    color: 'var(--text)',
    display: 'inline-flex',
    fontSize: '12px',
    fontWeight: 700,
    lineHeight: 1,
    padding: '6px 8px',
  },
  detailMeta: {
    alignItems: 'center',
    color: 'var(--muted)',
    display: 'flex',
    fontSize: '13px',
    gap: '8px',
    marginTop: '6px',
  },
  progressBar: {
    alignItems: 'center',
    borderBottom: '1px solid var(--border)',
    display: 'grid',
    gap: '10px',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    padding: '16px 20px',
  },
  progressStep: {
    alignItems: 'center',
    display: 'flex',
    gap: '8px',
  },
  progressDot: {
    background: 'var(--muted)',
    borderRadius: '999px',
    display: 'inline-block',
    height: '10px',
    width: '10px',
  },
  progressDotDone: {
    background: 'var(--success)',
    borderRadius: '999px',
    display: 'inline-block',
    height: '10px',
    width: '10px',
  },
  progressLabel: {
    color: 'var(--muted)',
    fontSize: '13px',
    fontWeight: 700,
  },
  progressLabelDone: {
    color: 'var(--text)',
    fontSize: '13px',
    fontWeight: 700,
  },
} satisfies Record<string, React.CSSProperties>;
