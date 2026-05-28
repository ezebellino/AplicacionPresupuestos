import '@testing-library/jest-dom/vitest';

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Swal from 'sweetalert2';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardPage } from './DashboardPage';
import type { ExpenseCategory, ExpenseEntry, Quote } from '../../shared/api/client';

let currentRole: 'admin' | 'platform_admin' = 'admin';

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
}

function mockPlatformAdminSession() {
  currentRole = 'platform_admin';
}

function isoDateWithOffset(daysOffset: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().slice(0, 10);
}

describe('DashboardPage', () => {
  beforeEach(() => {
    currentRole = 'admin';
    setViewportWidth(1024);
    localStorage.setItem('auth_token', 'test-token');
    const expiredMembershipDate = isoDateWithOffset(-2);
    const upcomingMembershipDate = isoDateWithOffset(3);
    const expenseCategories: ExpenseCategory[] = [
      {
        id: 'expense-category-1',
        name: 'Stock',
        is_active: true,
      },
    ];
    const expenseEntries: ExpenseEntry[] = [
      {
        id: 'expense-1',
        client_id: null,
        client_name: null,
        category_id: 'expense-category-1',
        category_name: 'Stock',
        amount: '45000.00',
        detail: 'Compra de materiales para stock',
        notes: 'Caños y aislacion.',
        status: 'pending',
        created_at: '2026-05-20T11:00:00',
      },
    ];
    const quotes: Quote[] = [
      {
        id: 'quote-1',
        client_id: 'client-1',
        number: 'Q-000001',
        status: 'accepted',
        title: 'Instalacion',
        notes: null,
        valid_until: null,
        created_at: '2026-05-14T10:00:00',
        subtotal: '0.00',
        discount_total: '0.00',
        tax_total: '0.00',
        total: '121000.00',
        issued_at: '2026-05-14T11:00:00',
        items: [
          {
            id: 'quote-item-1',
            source_cost_item_id: 'cost-1',
            category: 'services',
            name: 'Instalacion',
            description: null,
            unit: 'servicio',
            quantity: '1.00',
            unit_price: '100000.00',
            tax_rate: '21.00',
            discount_amount: '0.00',
            line_subtotal: '100000.00',
            line_tax: '21000.00',
            line_total: '121000.00',
            position: 1,
          },
        ],
      },
      {
        id: 'quote-2',
        client_id: 'client-1',
        number: 'Q-000002',
        status: 'issued',
        title: 'Mantenimiento',
        notes: null,
        valid_until: null,
        created_at: '2026-05-16T09:00:00',
        subtotal: '0.00',
        discount_total: '0.00',
        tax_total: '0.00',
        total: '99000.00',
        issued_at: '2026-05-16T10:30:00',
        items: [
          {
            id: 'quote-item-2',
            source_cost_item_id: 'cost-1',
            category: 'services',
            name: 'Mantenimiento',
            description: null,
            unit: 'servicio',
            quantity: '1.00',
            unit_price: '81818.18',
            tax_rate: '21.00',
            discount_amount: '0.00',
            line_subtotal: '81818.18',
            line_tax: '17181.82',
            line_total: '99000.00',
            position: 1,
          },
        ],
      },
      {
        id: 'quote-3',
        client_id: 'client-1',
        number: 'Q-000003',
        status: 'rejected',
        title: 'Reparacion',
        notes: null,
        valid_until: null,
        created_at: '2026-05-12T08:00:00',
        subtotal: '0.00',
        discount_total: '0.00',
        tax_total: '0.00',
        total: '57000.00',
        issued_at: '2026-05-12T09:00:00',
        items: [
          {
            id: 'quote-item-3',
            source_cost_item_id: 'cost-1',
            category: 'services',
            name: 'Reparacion',
            description: null,
            unit: 'servicio',
            quantity: '1.00',
            unit_price: '47107.44',
            tax_rate: '21.00',
            discount_amount: '0.00',
            line_subtotal: '47107.44',
            line_tax: '9892.56',
            line_total: '57000.00',
            position: 1,
          },
        ],
      },
    ];
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:factura');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: RequestInit) => {
        if (url.endsWith('/auth/me')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                id: 'user-1',
                tenant_id: 'tenant-1',
                email: 'admin@empresa.test',
                role: currentRole,
                tenant: {
                  id: 'tenant-1',
                  name: 'Empresa Demo',
                  legal_name: null,
                  tax_id: null,
                  address: null,
                  phone: null,
                  email: null,
                  website: null,
                  logo_url: null,
                  invoice_notes: null,
                  default_tax_rate: '21.00',
                },
              }),
              { status: 200 },
            ),
          );
        }

        if (url.endsWith('/admin/tenants/me')) {
          if (options?.method === 'PATCH') {
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  id: 'tenant-1',
                  name: 'Empresa Demo',
                  legal_name: 'Empresa Demo SRL',
                  tax_id: '30-123',
                  address: 'Av. Siempre Viva 742',
                  phone: '+54 351 555 0101',
                  email: 'admin@empresa.test',
                  website: null,
                  logo_url: null,
                  invoice_notes: null,
                  default_tax_rate: '21.00',
                }),
                { status: 200 },
              ),
            );
          }

          return Promise.resolve(
            new Response(
              JSON.stringify({
                id: 'tenant-1',
                name: 'Empresa Demo',
                legal_name: null,
                tax_id: null,
                address: null,
                phone: null,
                email: null,
                website: null,
                logo_url: null,
                invoice_notes: null,
                default_tax_rate: '21.00',
              }),
              { status: 200 },
            ),
          );
        }

        if (url.endsWith('/admin/tenants/me/change-requests') && options?.method === 'POST') {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                id: 'request-1',
                tenant_id: 'tenant-1',
                requested_by_user_id: 'user-1',
                status: 'pending',
                current_name: 'Empresa Demo',
                current_legal_name: null,
                current_tax_id: null,
                proposed_name: 'Empresa Nueva',
                proposed_legal_name: null,
                proposed_tax_id: null,
                reason: 'Cambio comercial',
              }),
              { status: 201 },
            ),
          );
        }

        if (url.endsWith('/admin/tenants/me/change-requests')) {
          return Promise.resolve(new Response(JSON.stringify({ items: [] }), { status: 200 }));
        }

        if (url.endsWith('/admin/tenants/platform/signup-requests')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                items: [
                  {
                    id: 'signup-1',
                    company_name: 'AUBASA',
                    contact_name: 'Dario Lopez',
                    email: 'dario@test.com',
                    phone: '2245505050',
                    business_type: 'Infraestructura',
                    message: null,
                    status: 'pending',
                    review_notes: null,
                    created_tenant_id: null,
                    created_admin_email: null,
                  },
                  {
                    id: 'signup-2',
                    company_name: 'Test Empresa',
                    contact_name: 'Tester',
                    email: 'tester@example.com',
                    phone: '3515550000',
                    business_type: 'Prueba',
                    message: 'Consulta inicial',
                    status: 'rejected',
                    review_notes: 'Fuera de alcance',
                    created_tenant_id: null,
                    created_admin_email: null,
                  },
                ],
              }),
              { status: 200 },
            ),
          );
        }

        if (url.endsWith('/admin/tenants/platform/change-requests')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                items: [
                  {
                    id: 'change-1',
                    tenant_id: 'tenant-customer-1',
                    requested_by_user_id: 'user-customer-1',
                    status: 'pending',
                    current_name: 'DM Refrigeracion',
                    current_legal_name: null,
                    current_tax_id: null,
                    proposed_name: 'DM Refrigeracion SRL',
                    proposed_legal_name: null,
                    proposed_tax_id: null,
                    reason: 'Alta fiscal',
                  },
                  {
                    id: 'change-2',
                    tenant_id: 'tenant-customer-2',
                    requested_by_user_id: 'user-customer-2',
                    status: 'approved',
                    current_name: 'AUBASA',
                    current_legal_name: null,
                    current_tax_id: null,
                    proposed_name: 'AUBASA SA',
                    proposed_legal_name: 'Autopistas de Buenos Aires SA',
                    proposed_tax_id: '30-99999999-9',
                    reason: 'Actualizacion societaria',
                  },
                ],
              }),
              { status: 200 },
            ),
          );
        }

        if (url.endsWith('/admin/tenants/platform/memberships')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                items: [
                  {
                    id: 'tenant-customer-1',
                    name: 'DM Refrigeracion',
                    legal_name: null,
                    tax_id: null,
                    email: 'dm@test.com',
                    phone: '5492245476329',
                    membership_status: 'expired',
                    membership_due_date: expiredMembershipDate,
                    membership_last_payment_at: '2026-05-01',
                    membership_monthly_fee: '5000.00',
                    payments: [
                      {
                        id: 'payment-1',
                        paid_at: '2026-05-01',
                        months_covered: 1,
                        amount: '5000.00',
                        status: 'active',
                        cancelled_at: null,
                        cancel_reason: null,
                        quote_id: 'quote-1',
                        quote_number: 'Q-000001',
                        notes: 'Pago mensual',
                      },
                    ],
                  },
                  {
                    id: 'tenant-customer-2',
                    name: 'AUBASA',
                    legal_name: null,
                    tax_id: null,
                    email: 'aubasa@test.com',
                    phone: '5492245476330',
                    membership_status: 'active',
                    membership_due_date: upcomingMembershipDate,
                    membership_last_payment_at: '2026-04-15',
                    membership_monthly_fee: '5000.00',
                    payments: [
                      {
                        id: 'payment-2',
                        paid_at: '2026-04-15',
                        months_covered: 3,
                        amount: '14250.00',
                        status: 'active',
                        cancelled_at: null,
                        cancel_reason: null,
                        quote_id: 'quote-2',
                        quote_number: 'Q-000002',
                        notes: 'Pago trimestral',
                      },
                    ],
                  },
                ],
              }),
              { status: 200 },
            ),
          );
        }

        if (url.includes('/admin/tenants/platform/audit-events')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                items: [
                  {
                    id: 'audit-1',
                    created_at: '2026-05-28T10:00:00',
                    actor_user_id: 'user-platform-1',
                    actor_email: 'platform@factureasy.test',
                    actor_role: 'platform_admin',
                    tenant_id: 'tenant-customer-1',
                    entity_type: 'tenant_signup_request',
                    entity_id: 'signup-1',
                    action: 'approved',
                    summary: 'Solicitud de alta aprobada para AUBASA',
                    metadata_json: {
                      company_name: 'AUBASA',
                      admin_email: 'dario@test.com',
                    },
                  },
                  {
                    id: 'audit-2',
                    created_at: '2026-05-27T16:30:00',
                    actor_user_id: 'user-platform-1',
                    actor_email: 'platform@factureasy.test',
                    actor_role: 'platform_admin',
                    tenant_id: 'tenant-customer-2',
                    entity_type: 'membership_payment',
                    entity_id: 'payment-2',
                    action: 'created',
                    summary: 'Pago de membresia registrado para DM Refrigeracion',
                    metadata_json: {
                      tenant_name: 'DM Refrigeracion',
                      months_covered: 1,
                    },
                  },
                ],
              }),
              { status: 200 },
            ),
          );
        }

        if (url.endsWith('/clients/client-1') && options?.method === 'DELETE') {
          return Promise.resolve(new Response(null, { status: 204 }));
        }

        if (url.endsWith('/clients')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                items: [
                  {
                    id: 'client-1',
                    name: 'Acme Clima',
                    document: '30-123',
                    email: 'admin@acme.test',
                    phone: '+54 9 351 555 0101',
                    address: null,
                    notes: null,
                  },
                ],
              }),
              { status: 200 },
            ),
          );
        }

        if (url.endsWith('/clients/client-1/service-records')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                items: [
                  {
                    id: 'service-1',
                    client_id: 'client-1',
                    performed_at: '2026-05-14T10:30:00',
                    title: 'Mantenimiento preventivo',
                    description: 'Limpieza de filtros',
                    amount: '125000.00',
                  },
                ],
              }),
              { status: 200 },
            ),
          );
        }

        if (url.endsWith('/expenses/categories') && options?.method === 'POST') {
          const payload = JSON.parse(String(options.body));
          const createdCategory = {
            id: `expense-category-${expenseCategories.length + 1}`,
            name: payload.name,
            is_active: true,
          };
          expenseCategories.push(createdCategory);
          return Promise.resolve(new Response(JSON.stringify(createdCategory), { status: 201 }));
        }

        if (url.endsWith('/expenses/categories')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                items: expenseCategories,
              }),
              { status: 200 },
            ),
          );
        }

        if (url.match(/\/expenses\/expense-\d+$/) && options?.method === 'PATCH') {
          const payload = JSON.parse(String(options.body));
          const expenseId = url.split('/').at(-1) as string;
          const target = expenseEntries.find((entry) => entry.id === expenseId);
          if (!target) {
            return Promise.resolve(new Response(null, { status: 404 }));
          }
          Object.assign(target, payload);
          return Promise.resolve(new Response(JSON.stringify(target), { status: 200 }));
        }

        if (url.endsWith('/expenses') && options?.method === 'POST') {
          const payload = JSON.parse(String(options.body));
          const selectedClient =
            payload.client_id === 'client-1'
              ? 'Acme Clima'
              : null;
          const selectedCategory = expenseCategories.find((category) => category.id === payload.category_id) ?? null;
          const createdEntry = {
            id: `expense-${expenseEntries.length + 1}`,
            client_id: payload.client_id ?? null,
            client_name: selectedClient,
            category_id: payload.category_id ?? null,
            category_name: selectedCategory?.name ?? null,
            amount: payload.amount,
            detail: payload.detail,
            notes: payload.notes ?? null,
            status: payload.status,
            created_at: '2026-05-27T10:00:00',
          };
          expenseEntries.unshift(createdEntry);
          return Promise.resolve(new Response(JSON.stringify(createdEntry), { status: 201 }));
        }

        if (url.endsWith('/expenses')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                items: expenseEntries,
              }),
              { status: 200 },
            ),
          );
        }

        if (url.endsWith('/cost-items')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                items: [
                  {
                    id: 'cost-1',
                    category: 'services',
                    name: 'Instalacion',
                    description: null,
                    unit: 'servicio',
                    unit_cost: '450000.00',
                    tax_rate: null,
                    effective_tax_rate: '21.00',
                    is_active: true,
                  },
                ],
              }),
              { status: 200 },
            ),
          );
        }

        if (url.endsWith('/quotes/bulk-delete') && options?.method === 'POST') {
          const payload = JSON.parse(String(options.body));
          const remainingQuotes = quotes.filter((quote) => !payload.quote_ids.includes(quote.id));
          quotes.splice(0, quotes.length, ...remainingQuotes);
          return Promise.resolve(new Response(JSON.stringify({ deleted_count: payload.quote_ids.length }), { status: 200 }));
        }

        if (url.endsWith('/quotes')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                items: quotes,
              }),
              { status: 200 },
            ),
          );
        }

        if (url.match(/\/quotes\/quote-(1|2|3)\/pdf$/)) {
          return Promise.resolve(new Response(new Blob(['pdf'], { type: 'application/pdf' }), { status: 200 }));
        }

        return Promise.resolve(new Response(null, { status: 404 }));
      }),
    );
  });

  afterEach(() => {
    setViewportWidth(1024);
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders tenant workspace metrics from clients and cost items', async () => {
    render(<DashboardPage onLogout={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Panel operativo' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Servicios activos' })).toBeInTheDocument();
      expect(screen.getAllByText('Servicios').length).toBeGreaterThan(0);
      expect(screen.getByText('Presupuestos recientes')).toBeInTheDocument();
    });
  });

  it('searches services and shows quote progress badges', async () => {
    const user = userEvent.setup();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Servicios' }));
    await waitFor(() => expect(screen.getAllByText('Instalacion').length).toBeGreaterThan(0));

    await user.type(screen.getByPlaceholderText('Instalación, mantenimiento o desinstalación'), 'sin resultados');

    expect(screen.getByText('No hay servicios para esa busqueda.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Presupuestos' }));
    await user.click(screen.getByRole('button', { name: 'Editor' }));

    expect(screen.getByLabelText('Progreso del presupuesto')).toBeInTheDocument();
    expect(screen.getAllByText('Aceptado').length).toBeGreaterThan(0);
  });

  it('opens the client record on the services subsection from the clients table', async () => {
    const user = userEvent.setup();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Clientes' }));
    await waitFor(() => expect(screen.getByText('Acme Clima')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Historial' }));

    expect(await screen.findByRole('heading', { name: 'Ficha de Acme Clima' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('tablist', { name: 'Navegacion de ficha del cliente' })).getByRole('button', {
        name: 'Servicios',
      }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Mantenimiento preventivo')).toBeInTheDocument();
  });

  it('opens a quote from the client record in the quotes editor', async () => {
    const user = userEvent.setup();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Clientes' }));
    await waitFor(() => expect(screen.getByText('Acme Clima')).toBeInTheDocument());
    await user.click(screen.getByText('Acme Clima'));
    await user.click(
      within(await screen.findByRole('tablist', { name: 'Navegacion de ficha del cliente' })).getByRole('button', {
        name: 'Presupuestos',
      }),
    );
    await user.click((await screen.findAllByRole('button', { name: 'Abrir presupuesto' }))[0]);

    expect(await screen.findByRole('heading', { name: 'Q-000002' })).toBeInTheDocument();
    expect(screen.getByText('Totales y acciones')).toBeInTheDocument();
  });

  it('creates a new quote from the client record with the client preselected', async () => {
    const user = userEvent.setup();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Clientes' }));
    await waitFor(() => expect(screen.getByText('Acme Clima')).toBeInTheDocument());
    await user.click(screen.getByText('Acme Clima'));
    await user.click(await screen.findByRole('button', { name: 'Nuevo presupuesto' }));

    expect(await screen.findByRole('heading', { name: 'Editor de presupuesto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear borrador' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Cliente' })).toHaveValue('client-1');
  });

  it('opens Tesoreria on Resumen with internal navigation and summary metrics', async () => {
    const user = userEvent.setup();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Tesoreria' }));

    expect(await screen.findByRole('heading', { name: 'Resumen de tesoreria' })).toBeInTheDocument();
    const treasuryNavigation = screen.getByRole('tablist', { name: 'Navegacion de tesoreria' });
    expect(within(treasuryNavigation).getByRole('button', { name: 'Resumen' })).toBeInTheDocument();
    expect(within(treasuryNavigation).getByRole('button', { name: 'Movimientos' })).toBeInTheDocument();
    expect(within(treasuryNavigation).getByRole('button', { name: 'Cobros pendientes' })).toBeInTheDocument();
    expect(within(treasuryNavigation).getByRole('button', { name: 'Gastos' })).toBeInTheDocument();
    expect(await screen.findByText('Facturado aceptado')).toBeInTheDocument();
    expect(screen.getAllByText('$ 121.000,00').length).toBeGreaterThan(0);
    expect(screen.getByText('Pendiente emitido')).toBeInTheDocument();
    expect(screen.getByText('Rechazado')).toBeInTheDocument();
    expect(screen.getByText('Total de presupuestos')).toBeInTheDocument();
    expect(screen.getByText('Mes actual')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Atencion inmediata' })).toBeInTheDocument();
  });

  it('filters treasury movements by quote status', async () => {
    const user = userEvent.setup();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Tesoreria' }));
    await user.click(screen.getByRole('button', { name: 'Movimientos' }));
    await user.click(screen.getByRole('button', { name: 'Emitidos' }));

    expect(await screen.findByText('Q-000002 - 16/05/2026')).toBeInTheDocument();
    expect(screen.queryByText('Q-000001 - 14/05/2026')).not.toBeInTheDocument();
  });

  it('opens issued quotes from treasury pending collections', async () => {
    const user = userEvent.setup();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Tesoreria' }));
    await user.click(screen.getByRole('button', { name: 'Cobros pendientes' }));
    await user.click(await screen.findByRole('button', { name: 'Abrir presupuesto' }));

    expect(await screen.findByRole('heading', { name: 'Q-000002' })).toBeInTheDocument();
  });

  it('opens smart treasury with charts and insights', async () => {
    const user = userEvent.setup();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Tesoreria' }));
    await user.click(await screen.findByRole('button', { name: 'Tesoreria inteligente' }));

    expect(screen.getByRole('heading', { name: 'Tesoreria inteligente' })).toBeInTheDocument();
    expect(screen.getByText('Presupuestos aceptados por mes')).toBeInTheDocument();
    expect(screen.getByText('Meses mas facturados')).toBeInTheDocument();
    expect(screen.getByText('Reporte inteligente')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver a tesoreria' })).toBeInTheDocument();
  });

  it('registers treasury expenses and updates their status', async () => {
    const user = userEvent.setup();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Tesoreria' }));
    await user.click(screen.getByRole('button', { name: 'Gastos' }));

    expect(await screen.findByRole('heading', { name: 'Gastos' })).toBeInTheDocument();
    expect(screen.getByText('Compra de materiales para stock')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Monto'), '12500');
    await user.type(screen.getByLabelText('Detalle'), 'Compra de herramienta');
    await user.selectOptions(screen.getByLabelText('Categoria'), 'expense-category-1');
    await user.click(screen.getByRole('button', { name: 'Registrar gasto' }));

    expect(await screen.findByText('Compra de herramienta')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Marcar cobrado' })[0]);
    expect(await screen.findByRole('button', { name: 'Volver a pendiente' })).toBeInTheDocument();
  });

  it('bulk deletes quotes and treasury updates automatically', async () => {
    const user = userEvent.setup();
    const swalSpy = vi.spyOn(Swal, 'fire').mockResolvedValue({ isConfirmed: true } as never);

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Presupuestos' }));
    await user.click(screen.getByLabelText('Seleccionar Q-000001'));
    await user.click(screen.getByLabelText('Seleccionar Q-000002'));
    await user.click(screen.getByRole('button', { name: 'Eliminar seleccionados' }));

    expect(await screen.findByText('Q-000003')).toBeInTheDocument();
    expect(screen.queryByText('Q-000001')).not.toBeInTheDocument();
    expect(screen.queryByText('Q-000002')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tesoreria' }));
    await user.click(screen.getByRole('button', { name: 'Cobros pendientes' }));
    expect(await screen.findByText('No hay cobros pendientes en este momento.')).toBeInTheDocument();
    swalSpy.mockRestore();
  });

  it('opens whatsapp with a prefilled invoice message from pending collections', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Tesoreria' }));
    await user.click(screen.getByRole('button', { name: 'Cobros pendientes' }));
    await user.click(await screen.findByRole('button', { name: 'Enviar PDF por WhatsApp' }));

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith(
        expect.stringContaining('https://wa.me/5493515550101'),
        '_blank',
        'noopener,noreferrer',
      );
    });
    expect(openSpy.mock.calls.at(-1)?.[0]).toContain('Q-000002');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/quotes/quote-2/pdf'),
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    openSpy.mockRestore();
  });

  it('toggles from cyberpunk dark mode to light mode', async () => {
    const user = userEvent.setup();

    render(<DashboardPage onLogout={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Modo claro' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Modo claro' }));

    expect(screen.getByRole('button', { name: 'Dark mode' })).toBeInTheDocument();
  });

  it('can collapse the sidebar navigation', async () => {
    const user = userEvent.setup();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Minimizar menu' }));

    expect(screen.getByRole('button', { name: 'Expandir menu' })).toBeInTheDocument();
  });

  it('uses the mobile drawer and bottom navigation on compact screens', async () => {
    const user = userEvent.setup();
    setViewportWidth(390);

    render(<DashboardPage onLogout={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Abrir menu' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Accesos rapidos' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Minimizar menu' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
    const mobileMenu = screen.getByLabelText('Menu movil');

    expect(within(mobileMenu).queryByRole('button', { name: 'Resumen' })).not.toBeInTheDocument();
    expect(within(mobileMenu).queryByRole('button', { name: 'Clientes' })).not.toBeInTheDocument();
    expect(within(mobileMenu).queryByRole('button', { name: 'Presupuestos' })).not.toBeInTheDocument();
    expect(within(mobileMenu).queryByRole('button', { name: 'Tesoreria' })).not.toBeInTheDocument();
    expect(within(mobileMenu).getByRole('button', { name: 'Servicios' })).toBeInTheDocument();
    expect(within(mobileMenu).getByRole('button', { name: 'Empresa' })).toBeInTheDocument();

    await user.click(within(mobileMenu).getByRole('button', { name: 'Empresa' }));

    expect(await screen.findByRole('heading', { name: 'Perfil de empresa' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Menu movil')).not.toBeInTheDocument();
  });

  it('shows a topbar Perfil action for platform admins', async () => {
    const user = userEvent.setup();
    mockPlatformAdminSession();

    render(<DashboardPage onLogout={vi.fn()} />);

    expect(await screen.findByRole('button', { name: 'Perfil' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Empresa' })).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Perfil' }));

    expect(await screen.findByRole('heading', { name: 'Perfil de plataforma' })).toBeInTheDocument();
    expect(screen.getByText(/datos institucionales de factureasy/i)).toBeInTheDocument();
  });

  it('shows a total pending notifications badge for platform admins', async () => {
    mockPlatformAdminSession();

    render(<DashboardPage onLogout={vi.fn()} />);

    expect(await screen.findByRole('button', { name: 'Notificaciones' })).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('opens the notifications panel with grouped pending items', async () => {
    const user = userEvent.setup();
    mockPlatformAdminSession();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Notificaciones' }));
    const notificationsPanel = screen.getByLabelText('Panel de notificaciones');

    expect(screen.getByRole('heading', { name: 'Pendientes de plataforma' })).toBeInTheDocument();
    expect(within(notificationsPanel).getByText('Altas pendientes')).toBeInTheDocument();
    expect(within(notificationsPanel).getByText('Cambios fiscales')).toBeInTheDocument();
    expect(within(notificationsPanel).getByText('Membresias por vencer o vencidas')).toBeInTheDocument();
  });

  it('navigates to Plataforma from a notification action', async () => {
    const user = userEvent.setup();
    mockPlatformAdminSession();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Perfil' }));
    await user.click(screen.getByRole('button', { name: 'Notificaciones' }));
    await user.click(screen.getByRole('button', { name: 'Revisar solicitud' }));

    expect(await screen.findByRole('heading', { name: 'Solicitudes de alta' })).toBeInTheDocument();
  });

  it('opens Plataforma on Resumen by default for platform admins', async () => {
    const user = userEvent.setup();
    mockPlatformAdminSession();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Plataforma' }));

    expect(await screen.findByRole('heading', { name: 'Resumen de plataforma' })).toBeInTheDocument();
    const platformNavigation = screen.getByRole('tablist', { name: 'Navegacion de plataforma' });
    expect(within(platformNavigation).getByRole('button', { name: 'Resumen' })).toBeInTheDocument();
    expect(within(platformNavigation).getByRole('button', { name: 'Solicitudes (1)' })).toBeInTheDocument();
    expect(within(platformNavigation).getByRole('button', { name: 'Cambios fiscales (1)' })).toBeInTheDocument();
    expect(within(platformNavigation).getByRole('button', { name: 'Membresias (2)' })).toBeInTheDocument();
    expect(within(platformNavigation).getByRole('button', { name: 'Auditoria' })).toBeInTheDocument();
  });

  it('switches platform subsections from the internal navigation', async () => {
    const user = userEvent.setup();
    mockPlatformAdminSession();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Plataforma' }));
    await user.click(screen.getByRole('button', { name: 'Solicitudes (1)' }));
    expect(await screen.findByRole('heading', { name: 'Solicitudes de alta' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cambios fiscales (1)' }));
    expect(await screen.findByRole('heading', { name: 'Cambios fiscales' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Membresias (2)' }));
    expect(await screen.findByRole('heading', { name: 'Membresias SaaS' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Auditoria' }));
    expect(await screen.findByRole('heading', { name: 'Auditoria' })).toBeInTheDocument();
    expect(screen.getByText('Solicitud de alta aprobada para AUBASA')).toBeInTheDocument();
  });

  it('renders platform overview KPIs and immediate attention items', async () => {
    const user = userEvent.setup();
    mockPlatformAdminSession();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Plataforma' }));

    expect(await screen.findByText('Solicitudes pendientes')).toBeInTheDocument();
    expect(screen.getByText('Cambios fiscales pendientes')).toBeInTheDocument();
    expect(screen.getByText('Membresias activas')).toBeInTheDocument();
    expect(screen.getByText('Membresias vencidas')).toBeInTheDocument();
    expect(screen.getByText('Vencen en 3 dias')).toBeInTheDocument();
    expect(screen.getByText('A cobrar este mes')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cola operativa' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Membresias en riesgo' })).toBeInTheDocument();
  });

  it('shows pending-only operational content in Solicitudes and Cambios fiscales', async () => {
    const user = userEvent.setup();
    mockPlatformAdminSession();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Plataforma' }));
    await user.click(screen.getByRole('button', { name: 'Solicitudes (1)' }));
    expect(screen.queryByText('approved')).not.toBeInTheDocument();
    expect(screen.queryByText('rejected')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cambios fiscales (1)' }));
    expect(screen.queryByText('approved')).not.toBeInTheDocument();
    expect(screen.queryByText('rejected')).not.toBeInTheDocument();
  });

  it('filters memberships by operational status', async () => {
    const user = userEvent.setup();
    mockPlatformAdminSession();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Plataforma' }));
    await user.click(screen.getByRole('button', { name: 'Membresias (2)' }));
    await user.click(screen.getByRole('button', { name: 'Vencidas' }));

    expect(screen.getByText('DM Refrigeracion')).toBeInTheDocument();
    expect(screen.queryByText('AUBASA')).not.toBeInTheDocument();
    expect(screen.getByText('Pagos activos')).toBeInTheDocument();
    expect(screen.getByText(/Cuota actual/i)).toBeInTheDocument();
  });

  it('switches Solicitudes to Historial and shows resolved records', async () => {
    const user = userEvent.setup();
    mockPlatformAdminSession();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Plataforma' }));
    await user.click(screen.getByRole('button', { name: 'Solicitudes (1)' }));
    await user.click(screen.getByRole('button', { name: 'Historial' }));

    expect(await screen.findByText('Test Empresa')).toBeInTheDocument();
    expect(screen.getByText('rejected')).toBeInTheDocument();
  });

  it('renders pending signup requests with contact chips and actions', async () => {
    const user = userEvent.setup();
    mockPlatformAdminSession();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Plataforma' }));
    await user.click(screen.getByRole('button', { name: 'Solicitudes (1)' }));

    expect(screen.getByText('AUBASA')).toBeInTheDocument();
    expect(screen.getByText('Dario Lopez')).toBeInTheDocument();
    expect(screen.getByText('dario@test.com')).toBeInTheDocument();
    expect(screen.getByText('2245505050')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contactada' })).toBeInTheDocument();
  });

  it('shows resolved fiscal changes in Historial mode', async () => {
    const user = userEvent.setup();
    mockPlatformAdminSession();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Plataforma' }));
    await user.click(screen.getByRole('button', { name: 'Cambios fiscales (1)' }));
    await user.click(screen.getByRole('button', { name: 'Historial' }));

    expect(await screen.findByText('AUBASA')).toBeInTheDocument();
    expect(screen.getByText('approved')).toBeInTheDocument();
  });

  it('renders pending fiscal changes with proposed data chips and actions', async () => {
    const user = userEvent.setup();
    mockPlatformAdminSession();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Plataforma' }));
    await user.click(screen.getByRole('button', { name: 'Cambios fiscales (1)' }));

    expect(screen.getByText('DM Refrigeracion')).toBeInTheDocument();
    expect(screen.getByText('Empresa: DM Refrigeracion SRL')).toBeInTheDocument();
    expect(screen.getByText('Alta fiscal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aprobar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeInTheDocument();
  });

  it('switches Membresias to Historial and shows payment records', async () => {
    const user = userEvent.setup();
    mockPlatformAdminSession();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Plataforma' }));
    await user.click(screen.getByRole('button', { name: 'Membresias (2)' }));
    await user.click(screen.getByRole('button', { name: 'Historial' }));

    expect(await screen.findByText('Q-000001')).toBeInTheDocument();
    expect(screen.getByText('Mensual')).toBeInTheDocument();
    expect(screen.getByText(/Pago mensual/i)).toBeInTheDocument();
    expect(screen.getByText(/Pago trimestral/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Editar pago' })).not.toHaveLength(0);
    expect(screen.getAllByRole('button', { name: 'Anular pago' })).not.toHaveLength(0);
  });

  it('renders a compact platform selector on mobile', async () => {
    const user = userEvent.setup();
    setViewportWidth(390);
    mockPlatformAdminSession();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
    await user.click(await screen.findByRole('button', { name: 'Plataforma' }));

    expect(await screen.findByLabelText('Seccion de plataforma')).toBeInTheDocument();
  });

  it('keeps history controls usable on mobile platform sections', async () => {
    const user = userEvent.setup();
    setViewportWidth(390);
    mockPlatformAdminSession();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
    await user.click(await screen.findByRole('button', { name: 'Plataforma' }));
    await user.selectOptions(await screen.findByLabelText('Seccion de plataforma'), 'memberships');

    expect(await screen.findByRole('button', { name: 'Historial' })).toBeInTheDocument();
  });

  it('includes Perfil in the mobile drawer for platform admins', async () => {
    const user = userEvent.setup();
    setViewportWidth(390);
    mockPlatformAdminSession();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
    const mobileMenu = screen.getByLabelText('Menu movil');

    expect(within(mobileMenu).getByRole('button', { name: 'Perfil' })).toBeInTheDocument();
  });

  it('offers the six service operation presets', async () => {
    const user = userEvent.setup();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Servicios' }));

    expect(await screen.findByRole('button', { name: 'Instalación' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mantenimiento' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Carga de Gas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reparación' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mano de Obra' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desinstalación' })).toBeInTheDocument();
  });

  it('shows the reorganized clients workspace with list and record entrypoints', async () => {
    const user = userEvent.setup();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Clientes' }));

    expect(await screen.findByRole('button', { name: 'Nuevo cliente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Listado' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ficha' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Historial' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument();
  });

  it('opens the company profile settings', async () => {
    const user = userEvent.setup();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Empresa' }));

    expect(await screen.findByRole('heading', { name: 'Perfil de empresa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Datos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Facturacion' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vista previa' })).toBeInTheDocument();
    expect(screen.getByText('Empresa: Empresa Demo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Solicitar cambio fiscal' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Vista previa PDF de factura')).not.toBeInTheDocument();
  });

  it('switches company profile sections and shows the PDF preview separately', async () => {
    const user = userEvent.setup();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Empresa' }));
    await user.click(await screen.findByRole('button', { name: 'Vista previa' }));

    expect(await screen.findByText('Vista PDF')).toBeInTheDocument();
    expect(screen.getByLabelText('Vista previa PDF de factura')).toBeInTheDocument();
  });

  it('creates a tenant fiscal change request from company settings', async () => {
    const user = userEvent.setup();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Empresa' }));
    await user.type(await screen.findByLabelText('Nuevo nombre de empresa'), 'Empresa Nueva');
    await user.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    expect(await screen.findByText('pending')).toBeInTheDocument();
    expect(screen.getByText('Empresa: Empresa Nueva')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/admin/tenants/me/change-requests'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('keeps the new quote form hidden until requested', async () => {
    const user = userEvent.setup();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Presupuestos' }));
    await waitFor(() => expect(screen.getAllByText('Q-000001').length).toBeGreaterThan(0));

    expect(screen.getByRole('button', { name: 'Listado (3)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editor' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Crear borrador' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Nuevo presupuesto' }));

    expect(screen.getByRole('button', { name: 'Crear borrador' })).toBeInTheDocument();
  });

  it('opens an existing quote in the editor workflow', async () => {
    const user = userEvent.setup();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Presupuestos' }));
    await user.click(await screen.findByRole('button', { name: /Q-000001/i }));

    expect(await screen.findByRole('heading', { name: 'Q-000001' })).toBeInTheDocument();
    expect(screen.getByText('Totales y acciones')).toBeInTheDocument();
    expect(screen.getAllByText('Acme Clima').length).toBeGreaterThan(0);
  });

  it('opens the associated client from the quote editor', async () => {
    const user = userEvent.setup();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Presupuestos' }));
    await user.click(await screen.findByRole('button', { name: /Q-000001/i }));
    await user.click(await screen.findByRole('button', { name: 'Ver cliente' }));

    expect(await screen.findByRole('heading', { name: 'Ficha de Acme Clima' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Datos' })).toBeInTheDocument();
  });
});
