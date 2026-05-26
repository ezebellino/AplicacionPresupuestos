import '@testing-library/jest-dom/vitest';

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardPage } from './DashboardPage';

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

        if (url.endsWith('/quotes')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                items: [
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
                ],
              }),
              { status: 200 },
            ),
          );
        }

        if (url.endsWith('/quotes/quote-1/pdf')) {
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
      expect(screen.getByText('Servicios activos')).toBeInTheDocument();
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

  it('opens a client service history from the clients table', async () => {
    const user = userEvent.setup();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Clientes' }));
    await waitFor(() => expect(screen.getByText('Acme Clima')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Historial' }));

    expect(await screen.findByText('Historial de Acme Clima')).toBeInTheDocument();
    expect(screen.getAllByText('Instalacion').length).toBeGreaterThan(0);
    expect(screen.getByText('Mantenimiento preventivo')).toBeInTheDocument();
  });

  it('shows treasury metrics from accepted quotes', async () => {
    const user = userEvent.setup();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Tesoreria' }));

    expect(await screen.findByText('Facturado aceptado')).toBeInTheDocument();
    expect(screen.getAllByText('$ 121.000,00').length).toBeGreaterThan(0);
    expect(screen.getByText('Facturacion por mes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar PDF por WhatsApp' })).toBeInTheDocument();
  });

  it('opens smart treasury with charts and insights', async () => {
    const user = userEvent.setup();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Tesoreria' }));
    await user.click(await screen.findByRole('button', { name: 'Tesoreria inteligente' }));

    expect(screen.getByRole('heading', { name: 'Tesoreria inteligente' })).toBeInTheDocument();
    expect(screen.getByText('Membresias cobradas por mes')).toBeInTheDocument();
    expect(screen.getByText('Meses mas facturados')).toBeInTheDocument();
    expect(screen.getByText('Reporte inteligente')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver a tesoreria' })).toBeInTheDocument();
  });

  it('opens whatsapp with a prefilled invoice message', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Tesoreria' }));
    await user.click(await screen.findByRole('button', { name: 'Enviar PDF por WhatsApp' }));

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith(
        expect.stringContaining('https://wa.me/5493515550101'),
        '_blank',
        'noopener,noreferrer',
      );
    });
    expect(openSpy.mock.calls.at(-1)?.[0]).toContain('Q-000001');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/quotes/quote-1/pdf'),
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
    expect(screen.getByRole('heading', { name: 'Atencion inmediata' })).toBeInTheDocument();
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

  it('switches Membresias to Historial and shows payment records', async () => {
    const user = userEvent.setup();
    mockPlatformAdminSession();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Plataforma' }));
    await user.click(screen.getByRole('button', { name: 'Membresias (2)' }));
    await user.click(screen.getByRole('button', { name: 'Historial' }));

    expect(await screen.findByText('Q-000001')).toBeInTheDocument();
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

  it('shows client actions without relying on a clipped table column', async () => {
    const user = userEvent.setup();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Clientes' }));

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

    expect(screen.getByRole('button', { name: 'Listado (1)' })).toBeInTheDocument();
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
});
