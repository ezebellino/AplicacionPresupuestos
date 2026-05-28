import type {
  ClientForm,
  CompanyProfileForm,
  CostForm,
  ExpenseForm,
  QuoteForm,
  ServiceRecordForm,
  TenantLegalChangeForm,
} from './types';

export const emptyClientForm: ClientForm = {
  name: '',
  document: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
};

export const emptyServiceRecordForm: ServiceRecordForm = {
  performed_at: new Date().toISOString().slice(0, 10),
  title: '',
  description: '',
  amount: '',
};

export const emptyCompanyProfileForm: CompanyProfileForm = {
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

export const emptyTenantLegalChangeForm: TenantLegalChangeForm = {
  proposed_name: '',
  proposed_legal_name: '',
  proposed_tax_id: '',
  reason: '',
};

export const emptyCostForm: CostForm = {
  category: 'services',
  name: '',
  description: '',
  unit: 'servicio',
  unit_cost: '',
  tax_rate: '',
};

export const emptyQuoteForm: QuoteForm = {
  client_id: '',
  title: '',
  notes: '',
  valid_until: '',
};

export const emptyExpenseForm: ExpenseForm = {
  amount: '',
  detail: '',
  notes: '',
  status: 'pending',
  client_id: '',
  category_id: '',
};
