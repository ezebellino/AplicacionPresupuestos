const runtimeApiUrl =
  typeof window !== 'undefined' ? window.__FACTUREASY_CONFIG__?.VITE_API_URL : undefined;
const API_URL = runtimeApiUrl || import.meta.env.VITE_API_URL || 'http://localhost:8000';

export type Client = {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
};

export type ClientPayload = {
  name: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
};

export type TenantProfile = {
  id: string;
  name: string;
  legal_name: string | null;
  tax_id: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  invoice_notes: string | null;
  membership_status: string;
  membership_due_date: string | null;
  membership_last_payment_at: string | null;
  membership_monthly_fee: string | null;
  default_tax_rate: string;
};

export type TenantProfilePayload = {
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logo_url?: string | null;
  invoice_notes?: string | null;
  default_tax_rate?: string | null;
};

export type TenantChangeRequest = {
  id: string;
  tenant_id: string;
  requested_by_user_id: string;
  status: string;
  current_name: string | null;
  current_legal_name: string | null;
  current_tax_id: string | null;
  proposed_name: string | null;
  proposed_legal_name: string | null;
  proposed_tax_id: string | null;
  reason: string | null;
};

export type TenantSignupRequest = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  business_type: string | null;
  message: string | null;
  status: string;
  review_notes: string | null;
  created_tenant_id: string | null;
  created_admin_email: string | null;
};

export type AuditEvent = {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  tenant_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  summary: string;
  metadata_json: Record<string, unknown> | null;
};

export type AuditEventFilters = {
  actor_email?: string;
  tenant_id?: string;
  entity_type?: string;
  action?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
};

export type PlatformTenantMembership = {
  id: string;
  name: string;
  legal_name: string | null;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  membership_status: string;
  membership_due_date: string | null;
  membership_last_payment_at: string | null;
  membership_monthly_fee: string | null;
  payments: PlatformTenantMembershipPayment[];
};

export type PlatformTenantMembershipPayment = {
  id: string;
  paid_at: string;
  months_covered: number;
  amount: string | null;
  status: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
  quote_id: string | null;
  quote_number: string | null;
  notes: string | null;
};

export type PlatformMembershipPaymentPayload = {
  months_covered: number;
  amount?: string | null;
  notes?: string | null;
};

export type PlatformMembershipPaymentUpdatePayload = {
  paid_at: string;
  months_covered: number;
  amount?: string | null;
  notes?: string | null;
};

export type PlatformMembershipPaymentCancelPayload = {
  reason: string;
};

export type TenantSignupRequestPayload = {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  business_type?: string | null;
  message?: string | null;
};

export type TenantChangeRequestPayload = {
  proposed_name?: string | null;
  proposed_legal_name?: string | null;
  proposed_tax_id?: string | null;
  reason?: string | null;
};

export type CurrentUser = {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  tenant: TenantProfile;
};

export type ClientServiceRecord = {
  id: string;
  client_id: string;
  performed_at: string;
  title: string;
  description: string | null;
  amount: string | null;
};

export type ClientServiceRecordPayload = {
  performed_at: string;
  title: string;
  description?: string | null;
  amount?: string | null;
};

export type ExpenseStatus = 'pending' | 'paid';

export type ExpenseCategory = {
  id: string;
  name: string;
  is_active: boolean;
};

export type ExpenseCategoryPayload = {
  name: string;
};

export type ExpenseEntry = {
  id: string;
  client_id: string | null;
  client_name: string | null;
  category_id: string | null;
  category_name: string | null;
  amount: string;
  detail: string;
  notes: string | null;
  status: ExpenseStatus;
  created_at: string;
};

export type ExpenseEntryPayload = {
  amount: string;
  detail: string;
  notes?: string | null;
  status: ExpenseStatus;
  client_id?: string | null;
  category_id?: string | null;
};

export type CostCategory = 'equipment' | 'materials' | 'labor' | 'services';

export type CostItem = {
  id: string;
  category: CostCategory;
  name: string;
  description: string | null;
  unit: string;
  unit_cost: string;
  tax_rate: string | null;
  effective_tax_rate: string;
  is_active: boolean;
};

export type CostItemPayload = {
  category: CostCategory;
  name: string;
  description?: string | null;
  unit: string;
  unit_cost: string;
  tax_rate?: string | null;
};

export type QuoteStatus = 'draft' | 'issued' | 'accepted' | 'rejected';

export type QuoteItem = {
  id: string;
  source_cost_item_id: string | null;
  category: CostCategory;
  name: string;
  description: string | null;
  unit: string;
  quantity: string;
  unit_price: string;
  tax_rate: string;
  discount_amount: string;
  line_subtotal: string;
  line_tax: string;
  line_total: string;
  position: number;
};

export type Quote = {
  id: string;
  client_id: string;
  number: string;
  status: QuoteStatus;
  title: string | null;
  notes: string | null;
  valid_until: string | null;
  created_at: string;
  subtotal: string;
  discount_total: string;
  tax_total: string;
  total: string;
  issued_at: string | null;
  items: QuoteItem[];
};

export type QuoteShareLink = {
  token: string;
  url: string;
};

export type QuoteBulkDeletePayload = {
  quote_ids: string[];
};

export type QuotePayload = {
  client_id: string;
  title?: string | null;
  notes?: string | null;
  valid_until?: string | null;
};

export type QuoteItemPayload = {
  source_cost_item_id: string;
  quantity: string;
  discount_amount?: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
};

async function request<TResponse>(
  path: string,
  options: RequestInit = {},
): Promise<TResponse> {
  const token = localStorage.getItem('auth_token');
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return response.json() as Promise<TResponse>;
}

function toQueryString(params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });

  const query = search.toString();
  return query ? `?${query}` : '';
}

export const apiClient = {
  login(payload: LoginRequest) {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getCurrentUser() {
    return request<CurrentUser>('/auth/me');
  },
  createTenantSignupRequest(payload: TenantSignupRequestPayload) {
    return request<TenantSignupRequest>('/admin/tenants/signup-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getTenantProfile() {
    return request<TenantProfile>('/admin/tenants/me');
  },
  updateTenantProfile(payload: TenantProfilePayload) {
    return request<TenantProfile>('/admin/tenants/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  listTenantChangeRequests() {
    return request<{ items: TenantChangeRequest[] }>('/admin/tenants/me/change-requests');
  },
  createTenantChangeRequest(payload: TenantChangeRequestPayload) {
    return request<TenantChangeRequest>('/admin/tenants/me/change-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  listPlatformSignupRequests() {
    return request<{ items: TenantSignupRequest[] }>('/admin/tenants/platform/signup-requests');
  },
  approvePlatformSignupRequest(id: string, adminPassword: string, reviewNotes?: string | null) {
    return request<TenantSignupRequest>(`/admin/tenants/platform/signup-requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ admin_password: adminPassword, review_notes: reviewNotes ?? null }),
    });
  },
  markPlatformSignupRequestContacted(id: string, reviewNotes?: string | null) {
    return request<TenantSignupRequest>(`/admin/tenants/platform/signup-requests/${id}/contacted`, {
      method: 'POST',
      body: JSON.stringify({ review_notes: reviewNotes ?? null }),
    });
  },
  rejectPlatformSignupRequest(id: string, reviewNotes?: string | null) {
    return request<TenantSignupRequest>(`/admin/tenants/platform/signup-requests/${id}/rejected`, {
      method: 'POST',
      body: JSON.stringify({ review_notes: reviewNotes ?? null }),
    });
  },
  listPlatformChangeRequests() {
    return request<{ items: TenantChangeRequest[] }>('/admin/tenants/platform/change-requests');
  },
  approvePlatformChangeRequest(id: string, reviewNotes?: string | null) {
    return request<TenantChangeRequest>(`/admin/tenants/platform/change-requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ review_notes: reviewNotes ?? null }),
    });
  },
  rejectPlatformChangeRequest(id: string, reviewNotes?: string | null) {
    return request<TenantChangeRequest>(`/admin/tenants/platform/change-requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ review_notes: reviewNotes ?? null }),
    });
  },
  listPlatformMemberships() {
    return request<{ items: PlatformTenantMembership[] }>('/admin/tenants/platform/memberships');
  },
  listPlatformAuditEvents(filters: AuditEventFilters = {}) {
    return request<{ items: AuditEvent[] }>(
      `/admin/tenants/platform/audit-events${toQueryString(filters)}`,
    );
  },
  markPlatformMembershipPaid(id: string, payload: PlatformMembershipPaymentPayload) {
    return request<PlatformTenantMembership>(`/admin/tenants/platform/memberships/${id}/paid`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updatePlatformMembershipPayment(
    tenantId: string,
    paymentId: string,
    payload: PlatformMembershipPaymentUpdatePayload,
  ) {
    return request<PlatformTenantMembership>(`/admin/tenants/platform/memberships/${tenantId}/payments/${paymentId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  cancelPlatformMembershipPayment(
    tenantId: string,
    paymentId: string,
    payload: PlatformMembershipPaymentCancelPayload,
  ) {
    return request<PlatformTenantMembership>(`/admin/tenants/platform/memberships/${tenantId}/payments/${paymentId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  listClients() {
    return request<{ items: Client[] }>('/clients');
  },
  createClient(payload: ClientPayload) {
    return request<Client>('/clients', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateClient(id: string, payload: ClientPayload) {
    return request<Client>(`/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  deleteClient(id: string) {
    return request<void>(`/clients/${id}`, {
      method: 'DELETE',
    });
  },
  listClientServiceRecords(clientId: string) {
    return request<{ items: ClientServiceRecord[] }>(`/clients/${clientId}/service-records`);
  },
  createClientServiceRecord(clientId: string, payload: ClientServiceRecordPayload) {
    return request<ClientServiceRecord>(`/clients/${clientId}/service-records`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  listExpenseCategories() {
    return request<{ items: ExpenseCategory[] }>('/expenses/categories');
  },
  createExpenseCategory(payload: ExpenseCategoryPayload) {
    return request<ExpenseCategory>('/expenses/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  deleteExpenseCategory(id: string) {
    return request<void>(`/expenses/categories/${id}`, {
      method: 'DELETE',
    });
  },
  listExpenseEntries() {
    return request<{ items: ExpenseEntry[] }>('/expenses');
  },
  createExpenseEntry(payload: ExpenseEntryPayload) {
    return request<ExpenseEntry>('/expenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateExpenseEntry(id: string, payload: Partial<ExpenseEntryPayload>) {
    return request<ExpenseEntry>(`/expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  listCostItems(category?: CostCategory) {
    const suffix = category ? `?category=${category}` : '';
    return request<{ items: CostItem[] }>(`/cost-items${suffix}`);
  },
  createCostItem(payload: CostItemPayload) {
    return request<CostItem>('/cost-items', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateCostItem(id: string, payload: CostItemPayload) {
    return request<CostItem>(`/cost-items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  deleteCostItem(id: string) {
    return request<void>(`/cost-items/${id}`, {
      method: 'DELETE',
    });
  },
  listQuotes() {
    return request<{ items: Quote[] }>('/quotes');
  },
  createQuote(payload: QuotePayload) {
    return request<Quote>('/quotes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  addQuoteItem(quoteId: string, payload: QuoteItemPayload) {
    return request<QuoteItem>(`/quotes/${quoteId}/items`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  deleteQuoteItem(quoteId: string, itemId: string) {
    return request<void>(`/quotes/${quoteId}/items/${itemId}`, {
      method: 'DELETE',
    });
  },
  issueQuote(id: string) {
    return request<Quote>(`/quotes/${id}/issue`, { method: 'POST' });
  },
  acceptQuote(id: string) {
    return request<Quote>(`/quotes/${id}/accept`, { method: 'POST' });
  },
  rejectQuote(id: string) {
    return request<Quote>(`/quotes/${id}/reject`, { method: 'POST' });
  },
  bulkDeleteQuotes(payload: QuoteBulkDeletePayload) {
    return request<{ deleted_count: number }>('/quotes/bulk-delete', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async downloadQuotePdf(id: string) {
    const token = localStorage.getItem('auth_token');
    const headers = new Headers();

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_URL}/quotes/${id}/pdf`, { headers });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return response.blob();
  },
  createQuoteShareLink(id: string) {
    return request<QuoteShareLink>(`/quotes/${id}/share-link`, {
      method: 'POST',
    });
  },
};
