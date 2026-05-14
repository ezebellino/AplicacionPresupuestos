import '@testing-library/jest-dom/vitest';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardPage } from './DashboardPage';

describe('DashboardPage', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'test-token');
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
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
                    phone: null,
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
                    category: 'equipment',
                    name: 'Equipo split 3000 frigorias',
                    description: null,
                    unit: 'unidad',
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
                    status: 'draft',
                    title: 'Instalacion',
                    notes: null,
                    valid_until: null,
                    subtotal: '0.00',
                    discount_total: '0.00',
                    tax_total: '0.00',
                    total: '0.00',
                    issued_at: null,
                    items: [],
                  },
                ],
              }),
              { status: 200 },
            ),
          );
        }

        return Promise.resolve(new Response(null, { status: 404 }));
      }),
    );
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('renders tenant workspace metrics from clients and cost items', async () => {
    render(<DashboardPage onLogout={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Panel operativo' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Costos activos')).toBeInTheDocument();
      expect(screen.getByText('Equipos')).toBeInTheDocument();
      expect(screen.getByText('Presupuestos recientes')).toBeInTheDocument();
    });
  });

  it('filters costs by category and shows quote progress badges', async () => {
    const user = userEvent.setup();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Costos' }));
    await waitFor(() => expect(screen.getByText('Equipo split 3000 frigorias')).toBeInTheDocument());

    await user.selectOptions(screen.getAllByLabelText('Categoria')[1], 'materials');

    expect(screen.getByText('No hay costos para esos filtros.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Presupuestos' }));

    expect(screen.getByLabelText('Progreso del presupuesto')).toBeInTheDocument();
    expect(screen.getAllByText('Borrador').length).toBeGreaterThan(0);
  });

  it('opens a client service history from the clients table', async () => {
    const user = userEvent.setup();

    render(<DashboardPage onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Clientes' }));
    await waitFor(() => expect(screen.getByText('Acme Clima')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Historial' }));

    expect(await screen.findByText('Historial de Acme Clima')).toBeInTheDocument();
    expect(screen.getByText('Mantenimiento preventivo')).toBeInTheDocument();
  });
});
