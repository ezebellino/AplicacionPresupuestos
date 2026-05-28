import type { FormEvent } from 'react';

import type {
  AuditEvent,
  AuditEventFilters,
  Client,
  ClientPayload,
  ClientServiceRecord,
  CostCategory,
  CostItem,
  CurrentUser,
  ExpenseCategory,
  ExpenseEntry,
  ExpenseStatus,
  PlatformTenantMembership,
  Quote,
  QuoteStatus,
  TenantChangeRequest,
  TenantSignupRequest,
  TenantProfile,
} from '../../shared/api/client';

export type View = 'summary' | 'clients' | 'costs' | 'quotes' | 'treasury' | 'company' | 'platform';
export type PlatformSection = 'overview' | 'signups' | 'changes' | 'memberships' | 'audit';
export type CompanySection = 'data' | 'billing' | 'preview';
export type QuoteSection = 'list' | 'editor';
export type ClientSection = 'list' | 'record';
export type ClientRecordSection = 'data' | 'services' | 'quotes';
export type TreasurySection = 'overview' | 'movements' | 'pending' | 'expenses';
export type TreasuryMovementFilter = 'all' | 'accepted' | 'issued' | 'rejected';
export type ExpenseFilter = 'all' | ExpenseStatus;
export type MembershipFilter = 'all' | 'expired' | 'due_soon' | 'active';

export type DashboardNavItem = {
  label: string;
  view: View;
};

export type ClientRecordRequest = {
  clientId: string;
  section: ClientRecordSection;
};

export type PlatformNotification =
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

export type ClientForm = {
  name: string;
  document: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
};

export type ServiceRecordForm = {
  performed_at: string;
  title: string;
  description: string;
  amount: string;
};

export type CompanyProfileForm = {
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

export type TenantLegalChangeForm = {
  proposed_name: string;
  proposed_legal_name: string;
  proposed_tax_id: string;
  reason: string;
};

export type CostForm = {
  category: CostCategory;
  name: string;
  description: string;
  unit: string;
  unit_cost: string;
  tax_rate: string;
};

export type QuoteForm = {
  client_id: string;
  title: string;
  notes: string;
  valid_until: string;
};

export type ExpenseForm = {
  amount: string;
  detail: string;
  notes: string;
  status: ExpenseStatus;
  client_id: string;
  category_id: string;
};

export type SummaryViewProps = {
  clients: Client[];
  costItems: CostItem[];
  isLoading: boolean;
  metrics: { label: string; value: string }[];
  onNewQuote: () => void;
  onOpenQuote: (quoteId: string) => void;
  quotes: Quote[];
};

export type CostsViewProps = {
  costItems: CostItem[];
  editingCostId: string | null;
  form: CostForm;
  isCompactLayout: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onDelete: (item: CostItem) => void;
  onEdit: (item: CostItem) => void;
  onFormChange: (form: CostForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  showOperationPresets: boolean;
};

export type ClientsViewProps = {
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
};

export type QuotesViewProps = {
  clients: Client[];
  costItems: CostItem[];
  editorRequestId: string | null;
  form: QuoteForm;
  isCompactLayout: boolean;
  isSaving: boolean;
  newQuoteClientIdRequest: string | null;
  onAddCostItem: (quote: Quote, item: CostItem) => void;
  onDeleteItem: (quote: Quote, itemId: string) => void;
  onDeleteQuotes: (quotes: Quote[]) => Promise<boolean>;
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
};

export type CompanyProfileViewProps = {
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
};

export type PlatformAdminViewProps = {
  activeSection: PlatformSection;
  auditEvents: AuditEvent[];
  auditFilters: AuditEventFilters;
  changeRequests: TenantChangeRequest[];
  hasMoreAuditEvents: boolean;
  isAuditLoading: boolean;
  isCompactLayout: boolean;
  isSaving: boolean;
  memberships: PlatformTenantMembership[];
  onAuditFilterChange: (filters: Partial<AuditEventFilters>) => void;
  onAuditLoadMore: () => void;
  onAuditResetFilters: () => void;
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
};

export type TreasuryViewProps = {
  clients: Client[];
  expenseCategories: ExpenseCategory[];
  expenseEntries: ExpenseEntry[];
  expenseForm: ExpenseForm;
  isCompactLayout: boolean;
  isSaving: boolean;
  onExpenseFormChange: (form: ExpenseForm) => void;
  onExpenseStatusChange: (entry: ExpenseEntry, status: ExpenseStatus) => void;
  onExpenseSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onManageExpenseCategories: () => void;
  onDownloadPdf: (quote: Quote) => void;
  onOpenQuote: (quoteId: string) => void;
  onSendInvoiceByWhatsApp: (quote: Quote) => void;
  quotes: Quote[];
};

export type DashboardStateSnapshot = {
  clients: import('../../shared/api/client').Client[];
  clientServiceRecords: ClientServiceRecord[];
  companyProfile: TenantProfile | null;
  costItems: CostItem[];
  currentUser: CurrentUser | null;
  expenseCategories: ExpenseCategory[];
  expenseEntries: ExpenseEntry[];
  memberships: PlatformTenantMembership[];
  platformChangeRequests: TenantChangeRequest[];
  platformSignupRequests: TenantSignupRequest[];
};
