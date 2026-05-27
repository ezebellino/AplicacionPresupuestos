import type { FormEvent } from 'react';

import type {
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
export type PlatformSection = 'overview' | 'signups' | 'changes' | 'memberships';
export type CompanySection = 'data' | 'billing' | 'preview';
export type QuoteSection = 'list' | 'editor';
export type ClientSection = 'list' | 'record';
export type ClientRecordSection = 'data' | 'services' | 'quotes';
export type TreasurySection = 'overview' | 'movements' | 'pending' | 'expenses';
export type TreasuryMovementFilter = 'all' | 'accepted' | 'issued' | 'rejected';
export type ExpenseFilter = 'all' | ExpenseStatus;
export type MembershipFilter = 'all' | 'expired' | 'due_soon' | 'active';

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
  clients: import('../../shared/api/client').Client[];
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
  isSaving: boolean;
  onCancel: () => void;
  onDelete: (item: CostItem) => void;
  onEdit: (item: CostItem) => void;
  onFormChange: (form: CostForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  showOperationPresets: boolean;
};

export type TreasuryViewProps = {
  clients: import('../../shared/api/client').Client[];
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
